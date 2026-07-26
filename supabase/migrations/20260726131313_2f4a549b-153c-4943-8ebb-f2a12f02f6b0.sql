
-- =========================================================
-- MARKETING AUTOMATION
-- =========================================================

CREATE TABLE IF NOT EXISTS public.marketing_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'custom',
  trigger_event text NOT NULL,
  enrollment_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  goal_event text,
  is_active boolean NOT NULL DEFAULT false,
  is_template boolean NOT NULL DEFAULT false,
  stats jsonb NOT NULL DEFAULT '{"enrolled":0,"completed":0,"goal_hit":0,"exited":0}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_journeys TO authenticated;
GRANT ALL ON public.marketing_journeys TO service_role;
ALTER TABLE public.marketing_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journeys_org_read" ON public.marketing_journeys FOR SELECT TO authenticated
  USING (organization_id IS NULL OR user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "journeys_org_write" ON public.marketing_journeys FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), organization_id));

CREATE TABLE IF NOT EXISTS public.journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  step_type text NOT NULL CHECK (step_type IN ('send_whatsapp','send_email','wait','condition','tag','emit_event','exit')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  delay_minutes int NOT NULL DEFAULT 0,
  branch_yes_step_id uuid,
  branch_no_step_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_steps TO authenticated;
GRANT ALL ON public.journey_steps TO service_role;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_steps_org" ON public.journey_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id
                 AND (j.organization_id IS NULL OR user_belongs_to_org(auth.uid(), j.organization_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketing_journeys j WHERE j.id = journey_id
                 AND j.organization_id IS NOT NULL AND user_belongs_to_org(auth.uid(), j.organization_id)));
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey ON public.journey_steps(journey_id, step_order);

CREATE TABLE IF NOT EXISTS public.journey_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid,
  booking_id uuid,
  current_step_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','exited','goal_hit','failed')),
  next_run_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  exit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(journey_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_enrollments TO authenticated;
GRANT ALL ON public.journey_enrollments TO service_role;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_enr_org" ON public.journey_enrollments FOR ALL TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_journey_enr_next ON public.journey_enrollments(status, next_run_at) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_journey_enr_org ON public.journey_enrollments(organization_id);

CREATE TABLE IF NOT EXISTS public.journey_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.journey_enrollments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.journey_steps(id) ON DELETE SET NULL,
  status text NOT NULL,
  error text,
  output jsonb,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.journey_step_runs TO authenticated;
GRANT ALL ON public.journey_step_runs TO service_role;
ALTER TABLE public.journey_step_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_runs_read" ON public.journey_step_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journey_enrollments e WHERE e.id = enrollment_id
                 AND user_belongs_to_org(auth.uid(), e.organization_id)));
CREATE POLICY "journey_runs_write" ON public.journey_step_runs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_journey_runs_enr ON public.journey_step_runs(enrollment_id, ran_at DESC);

-- Template renderer helper
CREATE OR REPLACE FUNCTION public._render_template(_text text, _vars jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE k text; v text; out text := coalesce(_text,'');
BEGIN
  IF _vars IS NULL THEN RETURN out; END IF;
  FOR k, v IN SELECT key, value::text FROM jsonb_each_text(_vars) LOOP
    out := replace(out, '{{'||k||'}}', coalesce(v,''));
  END LOOP;
  RETURN out;
END;$$;
REVOKE EXECUTE ON FUNCTION public._render_template(text,jsonb) FROM anon, public;

-- Enroll customer idempotently
CREATE OR REPLACE FUNCTION public.enroll_in_journey(
  p_journey_id uuid, p_customer_id uuid, p_context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_step uuid; v_id uuid;
BEGIN
  SELECT organization_id INTO v_org FROM marketing_journeys WHERE id = p_journey_id AND is_active;
  IF v_org IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_step FROM journey_steps WHERE journey_id = p_journey_id ORDER BY step_order LIMIT 1;
  INSERT INTO journey_enrollments(journey_id, organization_id, customer_id, current_step_id, context, next_run_at)
  VALUES (p_journey_id, v_org, p_customer_id, v_step, coalesce(p_context,'{}'::jsonb), now())
  ON CONFLICT (journey_id, customer_id) DO UPDATE SET context = journey_enrollments.context
  RETURNING id INTO v_id;
  UPDATE marketing_journeys SET stats = jsonb_set(stats,'{enrolled}',
    to_jsonb(coalesce((stats->>'enrolled')::int,0)+1)) WHERE id = p_journey_id;
  RETURN v_id;
END;$$;
REVOKE EXECUTE ON FUNCTION public.enroll_in_journey(uuid,uuid,jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.enroll_in_journey(uuid,uuid,jsonb) TO authenticated, service_role;

-- Step processor (cron)
CREATE OR REPLACE FUNCTION public.process_journey_enrollments(p_limit int DEFAULT 100)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; s record; v_processed int := 0; v_next uuid; v_customer record; v_vars jsonb; v_rendered text;
BEGIN
  FOR r IN SELECT * FROM journey_enrollments
           WHERE status='active' AND next_run_at <= now() ORDER BY next_run_at LIMIT p_limit
  LOOP
    SELECT * INTO s FROM journey_steps WHERE id = r.current_step_id;
    IF s.id IS NULL THEN
      UPDATE journey_enrollments SET status='completed', updated_at=now() WHERE id = r.id;
      CONTINUE;
    END IF;

    SELECT to_jsonb(c.*) INTO v_vars FROM customers c WHERE c.id = r.customer_id;
    v_vars := coalesce(v_vars,'{}'::jsonb) || coalesce(r.context,'{}'::jsonb);

    BEGIN
      IF s.step_type = 'send_whatsapp' THEN
        SELECT phone INTO v_customer FROM customers WHERE id = r.customer_id;
        IF v_customer.phone IS NOT NULL THEN
          v_rendered := _render_template(s.config->>'message', v_vars);
          INSERT INTO whatsapp_messages(organization_id, phone_number, direction, message_type, content, status, created_at)
          VALUES (r.organization_id, v_customer.phone, 'outbound', 'text', v_rendered, 'queued', now());
        END IF;
      ELSIF s.step_type = 'send_email' THEN
        SELECT email INTO v_customer FROM customers WHERE id = r.customer_id;
        IF v_customer.email IS NOT NULL THEN
          INSERT INTO email_queue(organization_id, email_type, recipient_email, recipient_name, subject, template_data, status)
          VALUES (r.organization_id, coalesce(s.config->>'template','journey'),
                  v_customer.email, coalesce(v_vars->>'name',''),
                  _render_template(s.config->>'subject', v_vars),
                  jsonb_build_object('body', _render_template(s.config->>'body', v_vars)) || v_vars,
                  'pending');
        END IF;
      ELSIF s.step_type = 'tag' THEN
        NULL;
      ELSIF s.step_type = 'emit_event' THEN
        PERFORM emit_event(coalesce(s.config->>'event','journey.custom'), 'journey', r.id::text, r.organization_id, v_vars);
      ELSIF s.step_type = 'exit' THEN
        UPDATE journey_enrollments SET status='completed', updated_at=now() WHERE id = r.id;
        INSERT INTO journey_step_runs(enrollment_id, step_id, status) VALUES (r.id, s.id, 'succeeded');
        v_processed := v_processed + 1;
        CONTINUE;
      END IF;
      INSERT INTO journey_step_runs(enrollment_id, step_id, status) VALUES (r.id, s.id, 'succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO journey_step_runs(enrollment_id, step_id, status, error) VALUES (r.id, s.id, 'failed', SQLERRM);
    END;

    SELECT id INTO v_next FROM journey_steps
      WHERE journey_id = (SELECT journey_id FROM journey_enrollments WHERE id = r.id)
        AND step_order > s.step_order ORDER BY step_order LIMIT 1;
    IF v_next IS NULL THEN
      UPDATE journey_enrollments SET status='completed', updated_at=now(), current_step_id=NULL WHERE id = r.id;
    ELSE
      UPDATE journey_enrollments SET
        current_step_id = v_next,
        next_run_at = now() + (COALESCE((SELECT delay_minutes FROM journey_steps WHERE id=v_next),0) || ' minutes')::interval,
        updated_at = now()
      WHERE id = r.id;
    END IF;
    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END;$$;
REVOKE EXECUTE ON FUNCTION public.process_journey_enrollments(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_journey_enrollments(int) TO service_role;

-- Seed 9 global journey templates
INSERT INTO public.marketing_journeys(organization_id, name, description, category, trigger_event, is_template, is_active)
VALUES
  (NULL, 'Welcome Lead', 'Greet a new lead and share the concierge story', 'lifecycle', 'customer.created', true, false),
  (NULL, 'Follow-up', 'Nudge unresponsive leads after 48 hours', 'sales', 'lead.no_response', true, false),
  (NULL, 'Abandoned Quote', 'Re-engage customers who received a quote but did not accept', 'sales', 'quote.sent', true, false),
  (NULL, 'Payment Reminder', 'Remind customer of outstanding invoice balance', 'finance', 'invoice.overdue', true, false),
  (NULL, 'Pre-Travel', 'Send trip essentials 5 days before departure', 'operations', 'booking.pre_travel', true, false),
  (NULL, 'Travel Day', 'Wish the traveler a great trip on departure day', 'operations', 'booking.travel_day', true, false),
  (NULL, 'Post-Travel Review', 'Request a review after the trip completes', 'lifecycle', 'booking.completed', true, false),
  (NULL, 'Loyalty', 'Celebrate repeat customers with perks', 'lifecycle', 'customer.loyalty_tier_up', true, false),
  (NULL, 'Win-back', 'Reactivate customers dormant for 6+ months', 'lifecycle', 'customer.dormant', true, false)
ON CONFLICT DO NOTHING;

-- =========================================================
-- TEMPLATE VERSIONING & APPROVAL
-- =========================================================

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS is_org_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  template_kind text NOT NULL CHECK (template_kind IN ('whatsapp','document')),
  template_id uuid NOT NULL,
  version_no int NOT NULL,
  snapshot jsonb NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_kind, template_id, version_no)
);
GRANT SELECT, INSERT ON public.template_versions TO authenticated;
GRANT ALL ON public.template_versions TO service_role;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_org_read" ON public.template_versions FOR SELECT TO authenticated
  USING (organization_id IS NULL OR user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "tv_org_write" ON public.template_versions FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR user_belongs_to_org(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public._snapshot_whatsapp_template()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_next int;
BEGIN
  SELECT coalesce(max(version_no),0)+1 INTO v_next FROM template_versions
    WHERE template_kind='whatsapp' AND template_id = NEW.id;
  INSERT INTO template_versions(organization_id, template_kind, template_id, version_no, snapshot, created_by)
  VALUES (NEW.organization_id, 'whatsapp', NEW.id, v_next, to_jsonb(NEW), auth.uid());
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_wa_tpl_version ON public.whatsapp_templates;
CREATE TRIGGER trg_wa_tpl_version AFTER INSERT OR UPDATE OF body_text, header_text, footer_text, buttons, variables
  ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public._snapshot_whatsapp_template();

CREATE OR REPLACE FUNCTION public._snapshot_document_template()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_next int;
BEGIN
  SELECT coalesce(max(version_no),0)+1 INTO v_next FROM template_versions
    WHERE template_kind='document' AND template_id = NEW.id;
  INSERT INTO template_versions(organization_id, template_kind, template_id, version_no, snapshot, created_by)
  VALUES (NEW.organization_id, 'document', NEW.id, v_next, to_jsonb(NEW), auth.uid());
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_doc_tpl_version ON public.document_templates;
CREATE TRIGGER trg_doc_tpl_version AFTER INSERT OR UPDATE OF header_color, accent_color, footer_text, bank_details, terms_text, notes_text
  ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public._snapshot_document_template();

-- =========================================================
-- STORAGE INSERT POLICY for documents bucket
-- =========================================================
DROP POLICY IF EXISTS "Org members can upload docs to their org" ON storage.objects;
CREATE POLICY "Org members can upload docs to their org" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (get_user_org_ids(auth.uid()))
);
