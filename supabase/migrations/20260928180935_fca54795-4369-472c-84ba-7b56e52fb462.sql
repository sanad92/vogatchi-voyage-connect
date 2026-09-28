CREATE TABLE public.quote_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text,
  owner_user_id uuid,
  step smallint NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified','done','responded','cancelled')),
  notified_at timestamptz,
  responded_at timestamptz,
  response_source text CHECK (response_source IN ('whatsapp','manual')),
  response_note text CHECK (char_length(response_note) <= 1000),
  response_message_id uuid,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, step)
);
GRANT SELECT, UPDATE ON public.quote_followups TO authenticated;
GRANT ALL ON public.quote_followups TO service_role;
ALTER TABLE public.quote_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view quote followups" ON public.quote_followups FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id,'quotes_view'));
CREATE INDEX quote_followups_due_idx ON public.quote_followups (due_at) WHERE status='pending';
CREATE INDEX quote_followups_customer_idx ON public.quote_followups (organization_id, customer_id) WHERE status IN ('pending','notified');
CREATE INDEX quote_followups_phone_idx ON public.quote_followups (organization_id, phone) WHERE status IN ('pending','notified');
CREATE TRIGGER update_quote_followups_updated_at BEFORE UPDATE ON public.quote_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public._digits(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS
$$ SELECT NULLIF(regexp_replace(COALESCE(t,''),'\D','','g'),'') $$;

-- Schedule 3 reminders (1, 3, 7 days) when a quote is sent; stop them when the quote closes.
CREATE OR REPLACE FUNCTION public._trg_quote_followups() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ph text;
BEGIN
  IF NEW.status='sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
    SELECT public._digits(phone) INTO ph FROM public.customers WHERE id=NEW.customer_id AND organization_id=NEW.organization_id;
    INSERT INTO public.quote_followups(organization_id,quote_id,customer_id,phone,owner_user_id,step,due_at)
    SELECT NEW.organization_id, NEW.id, NEW.customer_id, ph, COALESCE(auth.uid(), NEW.created_by), s.step, now() + s.gap
    FROM (VALUES (1, interval '1 day'), (2, interval '3 days'), (3, interval '7 days')) AS s(step, gap)
    ON CONFLICT (quote_id, step) DO NOTHING;
  ELSIF NEW.status IN ('accepted','rejected','expired','converted','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.quote_followups SET status='cancelled' WHERE quote_id=NEW.id AND status IN ('pending','notified');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._trg_quote_followups() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quote_followups_schedule AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public._trg_quote_followups();

-- A customer's WhatsApp reply records the response and stops remaining reminders.
CREATE OR REPLACE FUNCTION public._trg_quote_followups_on_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF NEW.direction <> 'inbound' OR NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  SELECT customer_id, public._digits(phone_number) AS ph INTO c
    FROM public.whatsapp_conversations WHERE id=NEW.conversation_id AND organization_id=NEW.organization_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  UPDATE public.quote_followups f SET status='responded', responded_at=now(), response_source='whatsapp',
      response_message_id=NEW.id, response_note=left(COALESCE(NEW.content, NEW.media_caption, '['||NEW.message_type||']'), 1000)
    WHERE f.organization_id=NEW.organization_id AND f.status IN ('pending','notified')
      AND ((c.customer_id IS NOT NULL AND f.customer_id=c.customer_id) OR (c.ph IS NOT NULL AND f.phone=c.ph));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._trg_quote_followups_on_reply() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quote_followups_on_reply AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public._trg_quote_followups_on_reply();

-- Employee records a response manually (call, in person) or marks a reminder done.
CREATE OR REPLACE FUNCTION public.record_quote_followup(_followup uuid, _action text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f public.quote_followups;
BEGIN
  SELECT * INTO f FROM public.quote_followups WHERE id=_followup FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'التذكير غير موجود' USING ERRCODE='P0002'; END IF;
  IF NOT public.can_org_write(f.organization_id) OR NOT public.has_org_permission(f.organization_id,'quotes_edit') THEN
    RAISE EXCEPTION 'ليست لديك صلاحية' USING ERRCODE='42501';
  END IF;
  IF f.status NOT IN ('pending','notified') THEN RAISE EXCEPTION 'التذكير مغلق بالفعل' USING ERRCODE='22023'; END IF;
  IF _note IS NOT NULL AND char_length(_note) > 1000 THEN RAISE EXCEPTION 'الملاحظة طويلة' USING ERRCODE='22023'; END IF;
  IF _action = 'responded' THEN
    UPDATE public.quote_followups SET status='responded', responded_at=now(), response_source='manual',
      response_note=NULLIF(btrim(_note),''), completed_by=auth.uid()
      WHERE quote_id=f.quote_id AND status IN ('pending','notified');
  ELSIF _action = 'done' THEN
    UPDATE public.quote_followups SET status='done', response_note=NULLIF(btrim(_note),''), completed_by=auth.uid() WHERE id=f.id;
  ELSE RAISE EXCEPTION 'إجراء غير معروف' USING ERRCODE='22023';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_quote_followup(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_quote_followup(uuid,text,text) TO authenticated;

-- Turns due reminders into in-app notifications for the responsible employee.
CREATE OR REPLACE FUNCTION public.dispatch_quote_followups() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH due AS (
    UPDATE public.quote_followups f SET status='notified', notified_at=now()
    WHERE f.id IN (SELECT id FROM public.quote_followups WHERE status='pending' AND due_at <= now() ORDER BY due_at LIMIT 500 FOR UPDATE SKIP LOCKED)
    RETURNING f.*
  ), ins AS (
    INSERT INTO public.notifications(user_id, organization_id, title, message, type, priority, action_url, metadata)
    SELECT d.owner_user_id, d.organization_id, 'تابع العميل على واتساب',
      'عرض السعر ' || q.quote_number || ' للعميل ' || COALESCE(q.customer_name,'') || ' — تذكير ' || d.step || ' من 3 بدون رد',
      'reminder', CASE WHEN d.step = 3 THEN 'high' ELSE 'normal' END, '/quotes/' || q.id,
      jsonb_build_object('quote_followup_id', d.id, 'quote_id', q.id)
    FROM due d JOIN public.quotes q ON q.id=d.quote_id WHERE d.owner_user_id IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO n FROM due;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_quote_followups() FROM PUBLIC, anon, authenticated;