
-- =============================================================
-- Sprint 10.3: Documents, Supplier 360, Workflow Rule Adapter
-- =============================================================

-- 1) Documents catalog ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.document_category AS ENUM (
    'passport','visa','voucher','invoice','purchase_order',
    'ticket','insurance','contract','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category public.document_category NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  tags text[] NOT NULL DEFAULT '{}',
  customer_id uuid,
  booking_id uuid,
  supplier_id uuid,
  expiry_date date,
  version int NOT NULL DEFAULT 1,
  parent_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_confidential boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents org members read"
ON public.documents FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = documents.organization_id
            AND m.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "documents org members write"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = documents.organization_id
            AND m.user_id = auth.uid())
);

CREATE POLICY "documents org members update"
ON public.documents FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = documents.organization_id
            AND m.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = documents.organization_id
            AND m.user_id = auth.uid())
);

CREATE POLICY "documents org members delete"
ON public.documents FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = documents.organization_id
            AND m.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_documents_org_created
  ON public.documents(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_customer  ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking   ON public.documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_supplier  ON public.documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_documents_category  ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry    ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags      ON public.documents USING gin(tags);

CREATE TRIGGER trg_documents_touch
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Document audit log ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  action text NOT NULL, -- uploaded | viewed | downloaded | updated | deleted | restored
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.document_audit_log TO authenticated;
GRANT ALL ON public.document_audit_log TO service_role;

ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc audit org read"
ON public.document_audit_log FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = document_audit_log.organization_id
            AND m.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "doc audit org insert"
ON public.document_audit_log FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = document_audit_log.organization_id
            AND m.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_doc_audit_doc  ON public.document_audit_log(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_audit_org  ON public.document_audit_log(organization_id, created_at DESC);

-- 3) Supplier contacts + notes -------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_contacts TO authenticated;
GRANT ALL ON public.supplier_contacts TO service_role;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_contacts org rw" ON public.supplier_contacts
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = supplier_contacts.organization_id
            AND m.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = supplier_contacts.organization_id
            AND m.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON public.supplier_contacts(supplier_id);
CREATE TRIGGER trg_supplier_contacts_touch BEFORE UPDATE ON public.supplier_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.supplier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_notes TO authenticated;
GRANT ALL ON public.supplier_notes TO service_role;
ALTER TABLE public.supplier_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_notes org rw" ON public.supplier_notes
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = supplier_notes.organization_id
            AND m.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = supplier_notes.organization_id
            AND m.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier ON public.supplier_notes(supplier_id, created_at DESC);
CREATE TRIGGER trg_supplier_notes_touch BEFORE UPDATE ON public.supplier_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Workflow rule executor adapter --------------------------------------
-- Supports:
--   Legacy shape (kept):
--     action = {"type":"emit","event":"...","payload":{...}}
--     action = {"type":"advance_stage","to":"..."}
--     action = {"type":"log_only"}
--   New visual-builder shape:
--     condition = {"all":[{"field":"amount","op":"gt","value":1000}, ...]}
--                 or {"any":[...]}
--     action    = {"steps":[
--                    {"type":"advance_stage","to":"paid"},
--                    {"type":"emit","event":"booking.paid","payload":{...}},
--                    {"type":"create_task","title":"Send voucher"},
--                    {"type":"send_whatsapp","template":"payment_ok"},
--                    {"type":"send_email","template":"..."},
--                    {"type":"add_tag","tag":"vip"},
--                    {"type":"emit_event","event":"..."}   -- alias of emit
--                 ]}
CREATE OR REPLACE FUNCTION public._workflow_get(payload jsonb, path text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
  cur   jsonb := payload;
  seg   text;
BEGIN
  IF payload IS NULL OR path IS NULL OR path = '' THEN RETURN NULL; END IF;
  parts := string_to_array(path, '.');
  FOREACH seg IN ARRAY parts LOOP
    IF cur IS NULL THEN RETURN NULL; END IF;
    cur := cur -> seg;
  END LOOP;
  RETURN cur;
END $$;

CREATE OR REPLACE FUNCTION public._workflow_check_condition(cond jsonb, ctx jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  op   text;
  fld  text;
  val  jsonb;
  cur  jsonb;
  clauses jsonb;
  clause  jsonb;
  ok bool;
BEGIN
  IF cond IS NULL OR cond = '{}'::jsonb THEN RETURN true; END IF;

  -- Composite: {all:[...]} or {any:[...]}
  IF cond ? 'all' THEN
    clauses := cond -> 'all';
    FOR i IN 0 .. jsonb_array_length(clauses) - 1 LOOP
      clause := clauses -> i;
      IF NOT public._workflow_check_condition(clause, ctx) THEN RETURN false; END IF;
    END LOOP;
    RETURN true;
  END IF;

  IF cond ? 'any' THEN
    clauses := cond -> 'any';
    FOR i IN 0 .. jsonb_array_length(clauses) - 1 LOOP
      clause := clauses -> i;
      IF public._workflow_check_condition(clause, ctx) THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  END IF;

  -- Leaf: {field, op, value}
  fld := cond ->> 'field';
  op  := coalesce(cond ->> 'op', 'eq');
  val := cond -> 'value';
  IF fld IS NULL THEN RETURN true; END IF;

  cur := public._workflow_get(ctx, fld);

  ok := CASE op
    WHEN 'eq'        THEN cur = val
    WHEN 'neq'       THEN cur IS DISTINCT FROM val
    WHEN 'gt'        THEN (cur)::text::numeric >  (val)::text::numeric
    WHEN 'gte'       THEN (cur)::text::numeric >= (val)::text::numeric
    WHEN 'lt'        THEN (cur)::text::numeric <  (val)::text::numeric
    WHEN 'lte'       THEN (cur)::text::numeric <= (val)::text::numeric
    WHEN 'in'        THEN val @> cur
    WHEN 'contains'  THEN (cur::text) ILIKE ('%' || (val #>> '{}') || '%')
    WHEN 'exists'    THEN cur IS NOT NULL
    WHEN 'missing'   THEN cur IS NULL
    ELSE true
  END;
  RETURN coalesce(ok, false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public._workflow_run_step(
  step jsonb, p_event public.domain_events, p_rule_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text := step ->> 'type';
BEGIN
  IF t IN ('emit','emit_event') THEN
    PERFORM public.emit_event(
      step ->> 'event',
      p_event.aggregate_type,
      p_event.aggregate_id,
      p_event.organization_id,
      coalesce(step -> 'payload', '{}'::jsonb) || jsonb_build_object('via_rule', p_rule_id),
      'rule:'||p_rule_id||':'||p_event.id||':'||md5(step::text)
    );
  ELSIF t = 'advance_stage' AND p_event.aggregate_type = 'booking' THEN
    UPDATE public.bookings
    SET workflow_stage = (step ->> 'to')::booking_workflow_stage
    WHERE id = p_event.aggregate_id;
  ELSIF t = 'create_task' AND p_event.aggregate_type = 'booking' THEN
    INSERT INTO public.booking_tasks(
      booking_id, organization_id, title, description, status
    ) VALUES (
      p_event.aggregate_id, p_event.organization_id,
      coalesce(step ->> 'title','مهمة تلقائية'),
      step ->> 'description', 'pending'
    );
  ELSIF t = 'add_tag' AND p_event.aggregate_type = 'booking' THEN
    UPDATE public.bookings
    SET workflow_stage = workflow_stage  -- no-op; tags column optional; use timeline
    WHERE id = p_event.aggregate_id;
    INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
    VALUES (p_event.aggregate_id, p_event.organization_id, 'tag_added',
            'Tag: '||coalesce(step ->> 'tag',''),
            jsonb_build_object('tag', step ->> 'tag'));
  ELSIF t IN ('send_whatsapp','send_email','log_only') THEN
    -- Delegate to timeline as a signal; downstream handler picks it up
    INSERT INTO public.booking_timeline_events(booking_id, organization_id, event_type, description, metadata)
    VALUES (
      CASE WHEN p_event.aggregate_type = 'booking' THEN p_event.aggregate_id ELSE NULL END,
      p_event.organization_id, t, coalesce(step ->> 'note', t), step
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handler_workflow_rules(p_event public.domain_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_started timestamptz;
  v_ms int;
  ctx jsonb;
  steps jsonb;
  i int;
BEGIN
  ctx := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb)
         || jsonb_build_object(
              'event_type', p_event.event_type,
              'aggregate_type', p_event.aggregate_type,
              'aggregate_id', p_event.aggregate_id,
              'organization_id', p_event.organization_id
            );

  FOR r IN
    SELECT * FROM public.workflow_rules
    WHERE event_type = p_event.event_type
      AND is_active = true
      AND (organization_id IS NULL OR organization_id = p_event.organization_id)
    ORDER BY priority ASC
  LOOP
    v_started := clock_timestamp();
    BEGIN
      -- Condition gate (new shape only; legacy rules carry empty {} → passes)
      IF NOT public._workflow_check_condition(coalesce(r.condition, '{}'::jsonb), ctx) THEN
        INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms)
        VALUES (r.id, p_event.id, p_event.organization_id, 'skipped',
                extract(millisecond from (clock_timestamp() - v_started))::int)
        ON CONFLICT (rule_id, event_id) DO NOTHING;
        CONTINUE;
      END IF;

      -- New shape: {steps:[...]}
      IF r.action ? 'steps' THEN
        steps := r.action -> 'steps';
        FOR i IN 0 .. jsonb_array_length(steps) - 1 LOOP
          PERFORM public._workflow_run_step(steps -> i, p_event, r.id);
        END LOOP;

      -- Legacy shape (unchanged)
      ELSIF r.action ->> 'type' = 'emit' THEN
        PERFORM public.emit_event(
          r.action ->> 'event', p_event.aggregate_type, p_event.aggregate_id,
          p_event.organization_id,
          coalesce(r.action -> 'payload','{}'::jsonb) || jsonb_build_object('via_rule', r.id),
          'rule:'||r.id||':'||p_event.id
        );
      ELSIF r.action ->> 'type' = 'advance_stage'
            AND p_event.aggregate_type = 'booking' THEN
        UPDATE public.bookings
        SET workflow_stage = (r.action ->> 'to')::booking_workflow_stage
        WHERE id = p_event.aggregate_id;
      END IF;

      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms)
      VALUES (r.id, p_event.id, p_event.organization_id, 'succeeded', v_ms)
      ON CONFLICT (rule_id, event_id) DO NOTHING;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms,
          success_count = success_count + 1, updated_at = now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      v_ms := extract(millisecond from (clock_timestamp() - v_started))::int;
      INSERT INTO public.workflow_rule_runs(rule_id, event_id, organization_id, status, duration_ms, error)
      VALUES (r.id, p_event.id, p_event.organization_id, 'failed', v_ms, SQLERRM)
      ON CONFLICT (rule_id, event_id) DO UPDATE SET status='failed', error=EXCLUDED.error;
      UPDATE public.workflow_rules
      SET last_run_at = now(), last_duration_ms = v_ms,
          failure_count = failure_count + 1, updated_at = now()
      WHERE id = r.id;
    END;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.handler_workflow_rules(public.domain_events) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._workflow_run_step(jsonb, public.domain_events, uuid) FROM PUBLIC, anon;
