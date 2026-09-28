ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS quote_followup_days integer[] NOT NULL DEFAULT ARRAY[1,3,7],
  ADD COLUMN IF NOT EXISTS quote_followup_template text NOT NULL DEFAULT 'مرحباً {customer_name}، نتابع معك بخصوص عرض السعر رقم {quote_number} لرحلتك إلى {destination}. هل لديك أي استفسار أو تحب نعدّل شيئاً في العرض؟';

CREATE OR REPLACE FUNCTION public._validate_quote_followup_settings() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d integer; prev integer := 0;
BEGIN
  IF array_length(NEW.quote_followup_days,1) IS NULL OR array_length(NEW.quote_followup_days,1) > 5 THEN
    RAISE EXCEPTION 'حدد من تذكير واحد إلى 5 تذكيرات' USING ERRCODE='22023';
  END IF;
  FOREACH d IN ARRAY NEW.quote_followup_days LOOP
    IF d IS NULL OR d < 1 OR d > 90 OR d <= prev THEN
      RAISE EXCEPTION 'أيام التذكير يجب أن تكون تصاعدية بين 1 و 90' USING ERRCODE='22023';
    END IF;
    prev := d;
  END LOOP;
  IF char_length(btrim(NEW.quote_followup_template)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'نص رسالة المتابعة بين 10 و 1000 حرف' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_quote_followup_settings ON public.organization_settings;
CREATE TRIGGER validate_quote_followup_settings BEFORE INSERT OR UPDATE OF quote_followup_days, quote_followup_template
  ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public._validate_quote_followup_settings();

ALTER TABLE public.quote_followups DROP CONSTRAINT IF EXISTS quote_followups_step_check;

CREATE OR REPLACE FUNCTION public._trg_quote_followups() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ph text; days integer[];
BEGIN
  IF NEW.status='sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
    SELECT public._digits(phone) INTO ph FROM public.customers WHERE id=NEW.customer_id AND organization_id=NEW.organization_id;
    SELECT quote_followup_days INTO days FROM public.organization_settings WHERE organization_id=NEW.organization_id;
    days := COALESCE(days, ARRAY[1,3,7]);
    INSERT INTO public.quote_followups(organization_id,quote_id,customer_id,phone,owner_user_id,step,due_at)
    SELECT NEW.organization_id, NEW.id, NEW.customer_id, ph, COALESCE(auth.uid(), NEW.created_by), s.ord, now() + make_interval(days => s.d)
    FROM unnest(days) WITH ORDINALITY AS s(d, ord)
    ON CONFLICT (quote_id, step) DO NOTHING;
  ELSIF NEW.status IN ('accepted','rejected','expired','converted','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.quote_followups SET status='cancelled' WHERE quote_id=NEW.id AND status IN ('pending','notified');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._trg_quote_followups() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_quote_followups() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH due AS (
    UPDATE public.quote_followups f SET status='notified', notified_at=now()
    WHERE f.id IN (SELECT id FROM public.quote_followups WHERE status='pending' AND due_at <= now() ORDER BY due_at LIMIT 500 FOR UPDATE SKIP LOCKED)
    RETURNING f.*
  ), totals AS (
    SELECT quote_id, max(step) AS last_step FROM public.quote_followups WHERE quote_id IN (SELECT quote_id FROM due) GROUP BY quote_id
  ), ins AS (
    INSERT INTO public.notifications(user_id, organization_id, title, message, type, priority, action_url, metadata)
    SELECT d.owner_user_id, d.organization_id, 'تابع العميل على واتساب',
      'عرض السعر ' || q.quote_number || ' للعميل ' || COALESCE(q.customer_name,'') || ' — تذكير ' || d.step || ' من ' || t.last_step || ' بدون رد',
      'reminder', CASE WHEN d.step = t.last_step THEN 'high' ELSE 'normal' END, '/quotes/' || q.id,
      jsonb_build_object('quote_followup_id', d.id, 'quote_id', q.id)
    FROM due d JOIN public.quotes q ON q.id=d.quote_id JOIN totals t ON t.quote_id=d.quote_id WHERE d.owner_user_id IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO n FROM due;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_quote_followups() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.quote_followup_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  followup_id uuid REFERENCES public.quote_followups(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4096),
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_followup_messages TO authenticated;
GRANT ALL ON public.quote_followup_messages TO service_role;
ALTER TABLE public.quote_followup_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view quote followup messages" ON public.quote_followup_messages FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id,'quotes_view'));
CREATE INDEX quote_followup_messages_quote_idx ON public.quote_followup_messages (quote_id, created_at DESC);

-- Logs a follow-up message sent on WhatsApp and closes the earliest open reminder.
CREATE OR REPLACE FUNCTION public.log_quote_followup_message(_quote uuid, _conversation uuid, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; fid uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id=_quote;
  IF NOT FOUND THEN RAISE EXCEPTION 'العرض غير موجود' USING ERRCODE='P0002'; END IF;
  IF NOT public.can_org_write(q.organization_id) OR NOT public.has_org_permission(q.organization_id,'quotes_view') THEN
    RAISE EXCEPTION 'ليست لديك صلاحية' USING ERRCODE='42501';
  END IF;
  IF _conversation IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.whatsapp_conversations WHERE id=_conversation AND organization_id=q.organization_id) THEN
    RAISE EXCEPTION 'المحادثة لا تتبع الشركة' USING ERRCODE='22023';
  END IF;
  IF NULLIF(btrim(_message),'') IS NULL OR char_length(_message) > 4096 THEN RAISE EXCEPTION 'نص الرسالة غير صحيح' USING ERRCODE='22023'; END IF;
  SELECT id INTO fid FROM public.quote_followups WHERE quote_id=q.id AND status IN ('notified','pending')
    ORDER BY (status='notified') DESC, step LIMIT 1 FOR UPDATE;
  IF fid IS NOT NULL AND EXISTS (SELECT 1 FROM public.quote_followups WHERE id=fid AND (status='notified' OR due_at <= now() + interval '12 hours')) THEN
    UPDATE public.quote_followups SET status='done', completed_by=auth.uid(), response_note='أُرسلت رسالة متابعة على واتساب' WHERE id=fid;
  ELSE fid := NULL;
  END IF;
  INSERT INTO public.quote_followup_messages(organization_id,quote_id,conversation_id,followup_id,message,sent_by)
  VALUES (q.organization_id,q.id,_conversation,fid,btrim(_message),auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.log_quote_followup_message(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_quote_followup_message(uuid,uuid,text) TO authenticated;