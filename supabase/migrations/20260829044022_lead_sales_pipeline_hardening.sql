-- Leads & Sales Pipeline hardening
-- - makes all lead mutations RPC-only
-- - enforces role/owner boundaries around workflow actions
-- - adds lead activities and follow-up scheduling
-- - adds a safe lead-to-customer conversion path
-- - gives every lead a stable organization-scoped reference

ALTER TABLE public.sop_leads
  ADD COLUMN IF NOT EXISTS budget_currency text,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- One historical row has an end date before its start date. PostgreSQL checks a
-- NOT VALID constraint again on every UPDATE, even when the date is untouched.
-- Temporarily recreate the same constraint so references can be backfilled
-- without guessing or changing the historical dates.
ALTER TABLE public.sop_leads DROP CONSTRAINT IF EXISTS sop_leads_dates_valid;

UPDATE public.sop_leads
SET lead_number = 'LD-' || to_char(COALESCE(arrived_at, created_at, now()), 'YYYYMMDD') || '-' ||
                  upper(substr(replace(id::text, '-', ''), 1, 12))
WHERE NULLIF(btrim(lead_number), '') IS NULL;

ALTER TABLE public.sop_leads
  ADD CONSTRAINT sop_leads_dates_valid
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS sop_leads_org_number_unique_idx
  ON public.sop_leads (organization_id, lead_number)
  WHERE lead_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS sop_leads_org_owner_stage_idx
  ON public.sop_leads (organization_id, current_owner_id, stage, updated_at DESC)
  WHERE NOT is_legacy;

CREATE INDEX IF NOT EXISTS sop_leads_org_follow_up_idx
  ON public.sop_leads (organization_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL
    AND stage NOT IN ('won', 'lost', 'cancelled');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sop_leads_people_counts_valid'
      AND conrelid = 'public.sop_leads'::regclass
  ) THEN
    ALTER TABLE public.sop_leads
      ADD CONSTRAINT sop_leads_people_counts_valid
      CHECK (
        (adults IS NULL OR adults >= 1)
        AND children_count >= 0
        AND jsonb_typeof(children_ages) = 'array'
        AND jsonb_array_length(children_ages) = children_count
        AND (rooms IS NULL OR rooms >= 1)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sop_leads_commercial_values_valid'
      AND conrelid = 'public.sop_leads'::regclass
  ) THEN
    ALTER TABLE public.sop_leads
      ADD CONSTRAINT sop_leads_commercial_values_valid
      CHECK (
        (budget_amount IS NULL OR budget_amount >= 0)
        AND (budget_amount IS NULL OR budget_currency ~ '^[A-Z]{3}$')
        AND payment_policy IN ('full', 'deposit', 'credit', 'exception')
        AND (
          (payment_policy = 'deposit' AND deposit_percent > 0 AND deposit_percent <= 100)
          OR (payment_policy <> 'deposit' AND (deposit_percent IS NULL OR (deposit_percent >= 0 AND deposit_percent <= 100)))
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sop_lead_assignments_one_current_idx
  ON public.sop_lead_assignments (lead_id)
  WHERE is_current;

CREATE TABLE IF NOT EXISTS public.sop_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  due_at timestamptz,
  completed_at timestamptz,
  outcome text,
  notes text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sop_lead_activities_type_valid
    CHECK (activity_type IN ('call', 'whatsapp', 'email', 'meeting', 'note', 'task')),
  CONSTRAINT sop_lead_activities_status_valid
    CHECK (status IN ('planned', 'completed', 'cancelled')),
  CONSTRAINT sop_lead_activities_state_valid
    CHECK (
      (status = 'planned' AND due_at IS NOT NULL AND completed_at IS NULL)
      OR (status = 'completed' AND completed_at IS NOT NULL)
      OR status = 'cancelled'
    )
);

ALTER TABLE public.sop_lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sop_lead_activities_select_by_permission ON public.sop_lead_activities;
CREATE POLICY sop_lead_activities_select_by_permission
ON public.sop_lead_activities
FOR SELECT TO authenticated
USING (public.has_org_permission(organization_id, 'crm_view'));

CREATE INDEX IF NOT EXISTS sop_lead_activities_lead_time_idx
  ON public.sop_lead_activities (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sop_lead_activities_org_due_idx
  ON public.sop_lead_activities (organization_id, due_at)
  WHERE status = 'planned';

CREATE INDEX IF NOT EXISTS sop_lead_activities_assignee_due_idx
  ON public.sop_lead_activities (assigned_to, due_at)
  WHERE status = 'planned';

DROP TRIGGER IF EXISTS trg_sop_lead_activities_updated ON public.sop_lead_activities;
CREATE TRIGGER trg_sop_lead_activities_updated
BEFORE UPDATE ON public.sop_lead_activities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_sop_lead_activity_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  expected_org uuid;
BEGIN
  SELECT lead.organization_id INTO expected_org
  FROM public.sop_leads AS lead
  WHERE lead.id = NEW.lead_id;

  IF expected_org IS NULL OR NEW.organization_id IS DISTINCT FROM expected_org THEN
    RAISE EXCEPTION 'جهة العميل المحتمل لا تطابق جهة النشاط';
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    WHERE member.organization_id = expected_org
      AND member.user_id = NEW.assigned_to
      AND member.is_active
  ) THEN
    RAISE EXCEPTION 'الموظف المسؤول ليس عضواً نشطاً في المؤسسة';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_sop_lead_activity_organization() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_sop_lead_activity_organization_trigger ON public.sop_lead_activities;
CREATE TRIGGER enforce_sop_lead_activity_organization_trigger
BEFORE INSERT OR UPDATE OF organization_id, lead_id, assigned_to
ON public.sop_lead_activities
FOR EACH ROW EXECUTE FUNCTION public.enforce_sop_lead_activity_organization();

-- A parameterized lead list avoids injecting user text into PostgREST `.or(...)` filters.
CREATE OR REPLACE FUNCTION public.sop_search_leads(
  _org uuid,
  _stages public.sop_lead_stage[] DEFAULT NULL,
  _owner uuid DEFAULT NULL,
  _source text DEFAULT NULL,
  _search text DEFAULT NULL,
  _follow_up text DEFAULT NULL,
  _include_legacy boolean DEFAULT false,
  _sort text DEFAULT 'updated_at',
  _limit integer DEFAULT 500
)
RETURNS SETOF public.sop_leads
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_org_permission(_org, 'crm_view') THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض العملاء المحتملين لهذه المؤسسة';
  END IF;

  IF _follow_up IS NOT NULL AND _follow_up NOT IN ('overdue', 'today', 'upcoming', 'none') THEN
    RAISE EXCEPTION 'فلتر المتابعة غير صالح';
  END IF;

  RETURN QUERY
  SELECT lead.*
  FROM public.sop_leads AS lead
  WHERE lead.organization_id = _org
    AND (_include_legacy OR NOT lead.is_legacy)
    AND (_stages IS NULL OR lead.stage = ANY (_stages))
    AND (_owner IS NULL OR lead.current_owner_id = _owner)
    AND (_source IS NULL OR lead.lead_source = _source)
    AND (
      NULLIF(btrim(_search), '') IS NULL
      OR lead.contact_name ILIKE '%' || btrim(_search) || '%'
      OR lead.contact_email ILIKE '%' || btrim(_search) || '%'
      OR lead.destination ILIKE '%' || btrim(_search) || '%'
      OR lead.city ILIKE '%' || btrim(_search) || '%'
      OR lead.lead_number ILIKE '%' || btrim(_search) || '%'
      OR (
        public.normalize_phone_digits(_search) IS NOT NULL
        AND public.normalize_phone_digits(lead.contact_phone)
          LIKE '%' || public.normalize_phone_digits(_search) || '%'
      )
    )
    AND (
      _follow_up IS NULL
      OR (_follow_up = 'overdue' AND lead.next_follow_up_at < now())
      OR (_follow_up = 'today'
        AND lead.next_follow_up_at >= date_trunc('day', now())
        AND lead.next_follow_up_at < date_trunc('day', now()) + interval '1 day')
      OR (_follow_up = 'upcoming'
        AND lead.next_follow_up_at >= date_trunc('day', now()) + interval '1 day')
      OR (_follow_up = 'none' AND lead.next_follow_up_at IS NULL)
    )
  ORDER BY
    CASE WHEN _sort = 'arrival_asc' THEN lead.check_in END ASC NULLS LAST,
    CASE WHEN _sort = 'arrival_desc' THEN lead.check_in END DESC NULLS LAST,
    CASE WHEN _sort = 'follow_up' THEN lead.next_follow_up_at END ASC NULLS LAST,
    lead.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.sop_search_leads(
  uuid, public.sop_lead_stage[], uuid, text, text, text, boolean, text, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_search_leads(
  uuid, public.sop_lead_stage[], uuid, text, text, text, boolean, text, integer
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_save_lead(
  _org uuid,
  _lead uuid DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing public.sop_leads;
  saved public.sop_leads;
  name_value text := NULLIF(btrim(_payload->>'contact_name'), '');
  phone_value text := public.normalize_phone_digits(_payload->>'contact_phone');
  email_value text := public.normalize_email_address(_payload->>'contact_email');
  check_in_value date := NULLIF(_payload->>'check_in', '')::date;
  check_out_value date := NULLIF(_payload->>'check_out', '')::date;
  adults_value integer := NULLIF(_payload->>'adults', '')::integer;
  children_value integer := COALESCE(NULLIF(_payload->>'children_count', '')::integer, 0);
  ages_value jsonb := COALESCE(_payload->'children_ages', '[]'::jsonb);
  rooms_value integer := NULLIF(_payload->>'rooms', '')::integer;
  budget_value numeric := NULLIF(_payload->>'budget_amount', '')::numeric;
  currency_value text := upper(NULLIF(btrim(_payload->>'budget_currency'), ''));
  policy_value text := COALESCE(NULLIF(_payload->>'payment_policy', ''), 'full');
  deposit_value numeric := NULLIF(_payload->>'deposit_percent', '')::numeric;
  missing_fields text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_org_write(_org) THEN
    RAISE EXCEPTION 'غير مصرح لك بالكتابة في هذه المؤسسة';
  END IF;

  IF NOT public.has_org_permission(_org, CASE WHEN _lead IS NULL THEN 'crm_create' ELSE 'crm_edit' END) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية حفظ العملاء المحتملين';
  END IF;

  IF _lead IS NOT NULL THEN
    SELECT * INTO existing
    FROM public.sop_leads
    WHERE id = _lead AND organization_id = _org
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'العميل المحتمل غير موجود'; END IF;
  END IF;

  IF check_in_value IS NOT NULL AND check_out_value IS NOT NULL AND check_out_value < check_in_value THEN
    RAISE EXCEPTION 'تاريخ المغادرة يجب ألا يسبق تاريخ الوصول';
  END IF;
  IF adults_value IS NOT NULL AND adults_value < 1 THEN RAISE EXCEPTION 'عدد البالغين غير صالح'; END IF;
  IF children_value < 0 THEN RAISE EXCEPTION 'عدد الأطفال غير صالح'; END IF;
  IF jsonb_typeof(ages_value) <> 'array' OR jsonb_array_length(ages_value) <> children_value THEN
    RAISE EXCEPTION 'أعمار الأطفال لا تطابق عدد الأطفال';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(ages_value) AS age(value)
    WHERE age.value !~ '^\d+$' OR age.value::integer < 0 OR age.value::integer > 17
  ) THEN
    RAISE EXCEPTION 'عمر الطفل يجب أن يكون بين صفر و17 سنة';
  END IF;
  IF rooms_value IS NOT NULL AND rooms_value < 1 THEN RAISE EXCEPTION 'عدد الغرف غير صالح'; END IF;
  IF budget_value IS NOT NULL AND budget_value < 0 THEN RAISE EXCEPTION 'الميزانية لا يمكن أن تكون سالبة'; END IF;
  IF budget_value IS NOT NULL AND currency_value !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'عملة الميزانية مطلوبة بصيغة ISO من ثلاثة أحرف';
  END IF;
  IF policy_value NOT IN ('full', 'deposit', 'credit', 'exception') THEN RAISE EXCEPTION 'سياسة الدفع غير صالحة'; END IF;
  IF policy_value = 'deposit' AND (deposit_value IS NULL OR deposit_value <= 0 OR deposit_value > 100) THEN
    RAISE EXCEPTION 'نسبة الدفعة المقدمة يجب أن تكون أكبر من صفر وحتى 100';
  END IF;
  IF policy_value <> 'deposit' THEN deposit_value := NULL; END IF;

  IF _lead IS NULL THEN
    INSERT INTO public.sop_leads (
      organization_id, lead_number, contact_name, contact_phone, contact_email,
      destination, city, check_in, check_out, approx_dates, adults, children_count,
      children_ages, rooms, occupancy, service_type, nationality, market,
      budget_level, budget_amount, budget_currency, priorities, reference_hotel,
      reference_screenshot_url, special_requests, lead_source, campaign,
      payment_policy, deposit_percent, created_by
    ) VALUES (
      _org,
      'LD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      name_value, phone_value, email_value,
      NULLIF(btrim(_payload->>'destination'), ''), NULLIF(btrim(_payload->>'city'), ''),
      check_in_value, check_out_value, NULLIF(btrim(_payload->>'approx_dates'), ''),
      adults_value, children_value, ages_value, rooms_value,
      NULLIF(btrim(_payload->>'occupancy'), ''), NULLIF(btrim(_payload->>'service_type'), ''),
      NULLIF(btrim(_payload->>'nationality'), ''), NULLIF(btrim(_payload->>'market'), ''),
      NULLIF(btrim(_payload->>'budget_level'), ''), budget_value, currency_value,
      NULLIF(btrim(_payload->>'priorities'), ''), NULLIF(btrim(_payload->>'reference_hotel'), ''),
      NULLIF(btrim(_payload->>'reference_screenshot_url'), ''), NULLIF(btrim(_payload->>'special_requests'), ''),
      NULLIF(btrim(_payload->>'lead_source'), ''), NULLIF(btrim(_payload->>'campaign'), ''),
      policy_value, deposit_value, auth.uid()
    ) RETURNING * INTO saved;
  ELSE
    UPDATE public.sop_leads
    SET contact_name = name_value,
        contact_phone = phone_value,
        contact_email = email_value,
        destination = NULLIF(btrim(_payload->>'destination'), ''),
        city = NULLIF(btrim(_payload->>'city'), ''),
        check_in = check_in_value,
        check_out = check_out_value,
        approx_dates = NULLIF(btrim(_payload->>'approx_dates'), ''),
        adults = adults_value,
        children_count = children_value,
        children_ages = ages_value,
        rooms = rooms_value,
        occupancy = NULLIF(btrim(_payload->>'occupancy'), ''),
        service_type = NULLIF(btrim(_payload->>'service_type'), ''),
        nationality = NULLIF(btrim(_payload->>'nationality'), ''),
        market = NULLIF(btrim(_payload->>'market'), ''),
        budget_level = NULLIF(btrim(_payload->>'budget_level'), ''),
        budget_amount = budget_value,
        budget_currency = currency_value,
        priorities = NULLIF(btrim(_payload->>'priorities'), ''),
        reference_hotel = NULLIF(btrim(_payload->>'reference_hotel'), ''),
        reference_screenshot_url = NULLIF(btrim(_payload->>'reference_screenshot_url'), ''),
        special_requests = NULLIF(btrim(_payload->>'special_requests'), ''),
        lead_source = NULLIF(btrim(_payload->>'lead_source'), ''),
        campaign = NULLIF(btrim(_payload->>'campaign'), ''),
        payment_policy = policy_value,
        deposit_percent = deposit_value,
        updated_at = now()
    WHERE id = _lead AND organization_id = _org
    RETURNING * INTO saved;
  END IF;

  missing_fields := public.sop_intake_missing(saved);
  IF array_length(missing_fields, 1) IS NULL AND saved.intake_completed_at IS NULL THEN
    UPDATE public.sop_leads
    SET intake_completed_at = now()
    WHERE id = saved.id
    RETURNING * INTO saved;
  ELSIF saved.stage <> 'new' AND array_length(missing_fields, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'لا يمكن جعل ملف داخل مسار البيع غير مكتمل';
  END IF;

  RETURN jsonb_build_object('allowed', true, 'lead', to_jsonb(saved));
END;
$$;

REVOKE ALL ON FUNCTION public.sop_save_lead(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_save_lead(uuid, uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_add_lead_activity(
  _lead uuid,
  _activity_type text,
  _due_at timestamptz DEFAULT NULL,
  _notes text DEFAULT NULL,
  _assigned_to uuid DEFAULT NULL,
  _outcome text DEFAULT NULL,
  _completed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lead_row public.sop_leads;
  activity_row public.sop_lead_activities;
  assignee uuid;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل المحتمل غير موجود'; END IF;
  IF auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN
    RAISE EXCEPTION 'غير مصرح لك بإدارة متابعة هذا العميل المحتمل';
  END IF;
  IF _activity_type NOT IN ('call', 'whatsapp', 'email', 'meeting', 'note', 'task') THEN
    RAISE EXCEPTION 'نوع النشاط غير صالح';
  END IF;
  IF NOT _completed AND _due_at IS NULL THEN RAISE EXCEPTION 'موعد المتابعة مطلوب'; END IF;

  assignee := COALESCE(_assigned_to, lead_row.current_owner_id, auth.uid());

  INSERT INTO public.sop_lead_activities (
    organization_id, lead_id, activity_type, status, due_at, completed_at,
    outcome, notes, assigned_to, created_by, completed_by
  ) VALUES (
    lead_row.organization_id, _lead, _activity_type,
    CASE WHEN _completed THEN 'completed' ELSE 'planned' END,
    _due_at, CASE WHEN _completed THEN now() ELSE NULL END,
    NULLIF(btrim(_outcome), ''), NULLIF(btrim(_notes), ''), assignee, auth.uid(),
    CASE WHEN _completed THEN auth.uid() ELSE NULL END
  ) RETURNING * INTO activity_row;

  UPDATE public.sop_leads
  SET last_contact_at = CASE
        WHEN _completed AND _activity_type IN ('call', 'whatsapp', 'email', 'meeting') THEN now()
        ELSE last_contact_at END,
      first_response_at = CASE
        WHEN _completed AND _activity_type IN ('call', 'whatsapp', 'email', 'meeting')
          THEN COALESCE(first_response_at, now())
        ELSE first_response_at END,
      next_follow_up_at = CASE
        WHEN NOT _completed THEN LEAST(COALESCE(next_follow_up_at, _due_at), _due_at)
        ELSE next_follow_up_at END,
      stage = CASE
        WHEN NOT _completed AND stage IN ('qualified', 'quoted') THEN 'follow_up'::public.sop_lead_stage
        ELSE stage END,
      updated_at = now()
  WHERE id = _lead;

  PERFORM public.emit_event(
    'sop.lead.activity_created', 'sop_lead', _lead, lead_row.organization_id,
    jsonb_build_object('activity_id', activity_row.id, 'type', _activity_type,
      'status', activity_row.status, 'due_at', _due_at, 'assigned_to', assignee),
    'sop.lead.activity.' || activity_row.id::text
  );

  RETURN jsonb_build_object('allowed', true, 'activity', to_jsonb(activity_row));
END;
$$;

REVOKE ALL ON FUNCTION public.sop_add_lead_activity(uuid, text, timestamptz, text, uuid, text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_add_lead_activity(uuid, text, timestamptz, text, uuid, text, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_complete_lead_activity(
  _activity uuid,
  _outcome text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  activity_row public.sop_lead_activities;
  lead_row public.sop_leads;
BEGIN
  SELECT * INTO activity_row FROM public.sop_lead_activities WHERE id = _activity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'نشاط المتابعة غير موجود'; END IF;
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = activity_row.lead_id FOR UPDATE;

  IF auth.uid() IS NULL OR NOT public.can_org_write(activity_row.organization_id)
     OR NOT public.has_org_permission(activity_row.organization_id, 'crm_edit') THEN
    RAISE EXCEPTION 'غير مصرح لك بإكمال هذه المتابعة';
  END IF;
  IF activity_row.assigned_to IS DISTINCT FROM auth.uid()
     AND lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(activity_row.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'هذه المتابعة مسندة لموظف آخر';
  END IF;
  IF activity_row.status <> 'planned' THEN
    RETURN jsonb_build_object('allowed', true, 'activity', to_jsonb(activity_row), 'idempotent', true);
  END IF;

  UPDATE public.sop_lead_activities
  SET status = 'completed', completed_at = now(), completed_by = auth.uid(),
      outcome = COALESCE(NULLIF(btrim(_outcome), ''), outcome),
      notes = COALESCE(NULLIF(btrim(_notes), ''), notes), updated_at = now()
  WHERE id = _activity
  RETURNING * INTO activity_row;

  UPDATE public.sop_leads
  SET last_contact_at = CASE
        WHEN activity_row.activity_type IN ('call', 'whatsapp', 'email', 'meeting') THEN now()
        ELSE last_contact_at END,
      first_response_at = CASE
        WHEN activity_row.activity_type IN ('call', 'whatsapp', 'email', 'meeting')
          THEN COALESCE(first_response_at, now())
        ELSE first_response_at END,
      next_follow_up_at = (
        SELECT min(activity.due_at)
        FROM public.sop_lead_activities AS activity
        WHERE activity.lead_id = lead_row.id AND activity.status = 'planned'
      ),
      updated_at = now()
  WHERE id = lead_row.id;

  PERFORM public.emit_event(
    'sop.lead.activity_completed', 'sop_lead', lead_row.id, lead_row.organization_id,
    jsonb_build_object('activity_id', activity_row.id, 'type', activity_row.activity_type,
      'outcome', activity_row.outcome),
    'sop.lead.activity.completed.' || activity_row.id::text
  );

  RETURN jsonb_build_object('allowed', true, 'activity', to_jsonb(activity_row));
END;
$$;

REVOKE ALL ON FUNCTION public.sop_complete_lead_activity(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_complete_lead_activity(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_cancel_lead_activity(_activity uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  activity_row public.sop_lead_activities;
  lead_row public.sop_leads;
BEGIN
  SELECT * INTO activity_row FROM public.sop_lead_activities WHERE id = _activity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'نشاط المتابعة غير موجود'; END IF;
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = activity_row.lead_id FOR UPDATE;

  IF auth.uid() IS NULL OR NOT public.can_org_write(activity_row.organization_id)
     OR NOT public.has_org_permission(activity_row.organization_id, 'crm_edit') THEN
    RAISE EXCEPTION 'غير مصرح لك بإلغاء هذه المتابعة';
  END IF;
  IF activity_row.created_by IS DISTINCT FROM auth.uid()
     AND activity_row.assigned_to IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(activity_row.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'غير مصرح لك بإلغاء متابعة موظف آخر';
  END IF;

  IF activity_row.status = 'planned' THEN
    UPDATE public.sop_lead_activities
    SET status = 'cancelled', outcome = COALESCE(NULLIF(btrim(_reason), ''), outcome), updated_at = now()
    WHERE id = _activity RETURNING * INTO activity_row;
  END IF;

  UPDATE public.sop_leads
  SET next_follow_up_at = (
        SELECT min(activity.due_at)
        FROM public.sop_lead_activities AS activity
        WHERE activity.lead_id = lead_row.id AND activity.status = 'planned'
      ),
      updated_at = now()
  WHERE id = lead_row.id;

  RETURN jsonb_build_object('allowed', true, 'activity', to_jsonb(activity_row));
END;
$$;

REVOKE ALL ON FUNCTION public.sop_cancel_lead_activity(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_cancel_lead_activity(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_convert_lead_to_customer(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lead_row public.sop_leads;
  matched_ids uuid[];
  customer_id_value uuid;
  customer_was_created boolean := false;
  normalized_phone text;
  normalized_email text;
  customer_archived timestamptz;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل المحتمل غير موجود'; END IF;
  IF auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN
    RAISE EXCEPTION 'غير مصرح لك بتحويل هذا العميل المحتمل';
  END IF;
  IF lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(lead_row.organization_id, auth.uid())
     AND NOT public.sop_has_department(lead_row.organization_id, auth.uid(), 'customer_service') THEN
    RAISE EXCEPTION 'التحويل متاح للمسؤول عن الملف أو الإدارة أو خدمة العملاء';
  END IF;

  IF lead_row.customer_id IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', true, 'customer_id', lead_row.customer_id,
      'created', false, 'idempotent', true);
  END IF;
  IF NULLIF(btrim(lead_row.contact_name), '') IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'missing_fields', jsonb_build_array('contact_name'));
  END IF;

  normalized_phone := public.normalize_phone_digits(lead_row.contact_phone);
  normalized_email := public.normalize_email_address(lead_row.contact_email);
  IF normalized_phone IS NULL OR length(normalized_phone) < 6 THEN
    RETURN jsonb_build_object('allowed', false, 'missing_fields', jsonb_build_array('contact_phone'));
  END IF;

  SELECT array_agg(DISTINCT customer.id ORDER BY customer.id)
  INTO matched_ids
  FROM public.customers AS customer
  WHERE customer.organization_id = lead_row.organization_id
    AND (
      public.normalize_phone_digits(customer.phone) = normalized_phone
      OR (normalized_email IS NOT NULL AND public.normalize_email_address(customer.email) = normalized_email)
    );

  IF COALESCE(array_length(matched_ids, 1), 0) > 1 THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('customer_match_ambiguous'));
  ELSIF COALESCE(array_length(matched_ids, 1), 0) = 1 THEN
    customer_id_value := matched_ids[1];
    SELECT archived_at INTO customer_archived FROM public.customers WHERE id = customer_id_value;
    IF customer_archived IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false,
        'violations', jsonb_build_array('customer_match_archived'),
        'customer_id', customer_id_value);
    END IF;
  ELSE
    IF NOT public.has_org_permission(lead_row.organization_id, 'customers_create') THEN
      RAISE EXCEPTION 'ليس لديك صلاحية إنشاء سجل عميل';
    END IF;

    INSERT INTO public.customers (
      organization_id, name, phone, email, nationality, created_by
    ) VALUES (
      lead_row.organization_id, btrim(lead_row.contact_name), normalized_phone,
      normalized_email, NULLIF(btrim(lead_row.nationality), ''), auth.uid()
    ) RETURNING id INTO customer_id_value;
    customer_was_created := true;
  END IF;

  UPDATE public.sop_leads
  SET customer_id = customer_id_value, converted_at = now(), converted_by = auth.uid(), updated_at = now()
  WHERE id = _lead;

  UPDATE public.sop_pricing_requests
  SET customer_id = customer_id_value, updated_at = now()
  WHERE lead_id = _lead AND organization_id = lead_row.organization_id AND customer_id IS NULL;

  UPDATE public.quotes
  SET customer_id = customer_id_value, customer_name = COALESCE(customer_name, lead_row.contact_name), updated_at = now()
  WHERE id = lead_row.quote_id AND organization_id = lead_row.organization_id AND customer_id IS NULL;

  UPDATE public.bookings
  SET customer_id = customer_id_value, customer_name = COALESCE(customer_name, lead_row.contact_name), updated_at = now()
  WHERE id = lead_row.booking_id AND organization_id = lead_row.organization_id AND customer_id IS NULL;

  PERFORM public.emit_event(
    'sop.lead.converted_to_customer', 'sop_lead', _lead, lead_row.organization_id,
    jsonb_build_object('customer_id', customer_id_value, 'created', customer_was_created),
    'sop.lead.converted.' || _lead::text
  );

  RETURN jsonb_build_object('allowed', true, 'customer_id', customer_id_value,
    'created', customer_was_created);
END;
$$;

REVOKE ALL ON FUNCTION public.sop_convert_lead_to_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_convert_lead_to_customer(uuid) TO authenticated, service_role;

-- Existing workflow functions are kept as internal implementations, then wrapped
-- with the exact actor boundary required by the UI action.
ALTER FUNCTION public.sop_validate_transition(uuid, public.sop_lead_stage)
  RENAME TO sop_validate_transition_unsafe_impl;
ALTER FUNCTION public.sop_assign_lead(uuid, uuid, text)
  RENAME TO sop_assign_lead_unsafe_impl;
ALTER FUNCTION public.sop_claim_lead(uuid)
  RENAME TO sop_claim_lead_unsafe_impl;
ALTER FUNCTION public.sop_reassign_lead(uuid, uuid, text)
  RENAME TO sop_reassign_lead_unsafe_impl;
ALTER FUNCTION public.sop_acknowledge_assignment(uuid)
  RENAME TO sop_acknowledge_assignment_unsafe_impl;
ALTER FUNCTION public.sop_advance_lead(uuid, public.sop_lead_stage, text)
  RENAME TO sop_advance_lead_unsafe_impl;
ALTER FUNCTION public.sop_disqualify(uuid, text, text)
  RENAME TO sop_disqualify_unsafe_impl;
ALTER FUNCTION public.sop_reopen_lead(uuid)
  RENAME TO sop_reopen_lead_unsafe_impl;
ALTER FUNCTION public.sop_create_pricing_request(uuid, text)
  RENAME TO sop_create_pricing_request_unsafe_impl;
ALTER FUNCTION public.sop_request_recheck(uuid, text)
  RENAME TO sop_request_recheck_unsafe_impl;
ALTER FUNCTION public.sop_move_back(uuid, public.sop_lead_stage, text)
  RENAME TO sop_move_back_unsafe_impl;
ALTER FUNCTION public.sop_complete_recheck(uuid, boolean, text)
  RENAME TO sop_complete_recheck_unsafe_impl;
ALTER FUNCTION public.sop_return_to_sales(uuid)
  RENAME TO sop_return_to_sales_unsafe_impl;

REVOKE ALL ON FUNCTION public.sop_validate_transition_unsafe_impl(uuid, public.sop_lead_stage) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_assign_lead_unsafe_impl(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_claim_lead_unsafe_impl(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_reassign_lead_unsafe_impl(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_acknowledge_assignment_unsafe_impl(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_advance_lead_unsafe_impl(uuid, public.sop_lead_stage, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_disqualify_unsafe_impl(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_reopen_lead_unsafe_impl(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_create_pricing_request_unsafe_impl(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_request_recheck_unsafe_impl(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_move_back_unsafe_impl(uuid, public.sop_lead_stage, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_complete_recheck_unsafe_impl(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sop_return_to_sales_unsafe_impl(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.sop_validate_transition(_lead uuid, _to public.sop_lead_stage)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_leads WHERE id = _lead;
  IF org_id IS NULL THEN RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('lead_not_found')); END IF;
  IF auth.uid() IS NULL OR NOT public.has_org_permission(org_id, 'crm_view') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_validate_transition_unsafe_impl(_lead, _to);
END; $$;

CREATE FUNCTION public.sop_assign_lead(_lead uuid, _assignee uuid DEFAULT NULL, _exception_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead_row public.sop_leads;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_is_manager(lead_row.organization_id, auth.uid())
     AND NOT public.sop_has_department(lead_row.organization_id, auth.uid(), 'customer_service') THEN
    RAISE EXCEPTION 'الإسناد متاح لخدمة العملاء أو الإدارة فقط';
  END IF;
  IF _assignee IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sop_department_members member
    WHERE member.organization_id = lead_row.organization_id AND member.user_id = _assignee
      AND member.department = 'sales' AND member.is_available
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('assignee_not_available_sales'));
  END IF;
  RETURN public.sop_assign_lead_unsafe_impl(_lead, _assignee, _exception_reason);
END; $$;

CREATE FUNCTION public.sop_claim_lead(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_leads WHERE id = _lead;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR NOT public.has_org_permission(org_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_claim_lead_unsafe_impl(_lead);
END; $$;

CREATE FUNCTION public.sop_reassign_lead(_lead uuid, _assignee uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR NOT public.has_org_permission(org_id, 'crm_edit')
     OR NOT public.sop_is_manager(org_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_reassign_lead_unsafe_impl(_lead, _assignee, _reason);
END; $$;

CREATE FUNCTION public.sop_acknowledge_assignment(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT lead.organization_id INTO org_id FROM public.sop_leads lead WHERE lead.id = _lead;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.sop_lead_assignments assignment
       WHERE assignment.lead_id = _lead AND assignment.is_current AND assignment.assignee_id = auth.uid()
     ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_acknowledge_assignment_unsafe_impl(_lead);
END; $$;

CREATE FUNCTION public.sop_advance_lead(_lead uuid, _to public.sop_lead_stage, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead_row public.sop_leads;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(lead_row.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'تغيير المرحلة متاح للمسؤول عن الملف أو الإدارة فقط';
  END IF;
  RETURN public.sop_advance_lead_unsafe_impl(_lead, _to, _reason);
END; $$;

CREATE FUNCTION public.sop_disqualify(_lead uuid, _reason text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead_row public.sop_leads;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(lead_row.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_disqualify_unsafe_impl(_lead, _reason, _note);
END; $$;

CREATE FUNCTION public.sop_reopen_lead(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR NOT public.has_org_permission(org_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_is_manager(org_id, auth.uid())
     AND NOT public.sop_has_department(org_id, auth.uid(), 'customer_service') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_reopen_lead_unsafe_impl(_lead);
END; $$;

CREATE FUNCTION public.sop_create_pricing_request(_lead uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead_row public.sop_leads;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(lead_row.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_create_pricing_request_unsafe_impl(_lead, _notes);
END; $$;

CREATE FUNCTION public.sop_request_recheck(_lead uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE lead_row public.sop_leads;
BEGIN
  SELECT * INTO lead_row FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_org_write(lead_row.organization_id)
     OR NOT public.has_org_permission(lead_row.organization_id, 'crm_edit') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lead_row.current_owner_id IS DISTINCT FROM auth.uid()
     AND NOT public.sop_is_manager(lead_row.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_request_recheck_unsafe_impl(_lead, _notes);
END; $$;

CREATE FUNCTION public.sop_move_back(_lead uuid, _to public.sop_lead_stage, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR NOT public.has_org_permission(org_id, 'crm_edit')
     OR NOT public.sop_is_manager(org_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_move_back_unsafe_impl(_lead, _to, _reason);
END; $$;

CREATE FUNCTION public.sop_complete_recheck(_request uuid, _changed boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_pricing_requests WHERE id = _request FOR UPDATE;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR (NOT public.sop_has_department(org_id, auth.uid(), 'reservations')
         AND NOT public.sop_is_manager(org_id, auth.uid())) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_complete_recheck_unsafe_impl(_request, _changed, _notes);
END; $$;

CREATE FUNCTION public.sop_return_to_sales(_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sop_pricing_requests WHERE id = _request FOR UPDATE;
  IF org_id IS NULL OR auth.uid() IS NULL OR NOT public.can_org_write(org_id)
     OR (NOT public.sop_has_department(org_id, auth.uid(), 'reservations')
         AND NOT public.sop_is_manager(org_id, auth.uid())) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.sop_return_to_sales_unsafe_impl(_request);
END; $$;

REVOKE ALL ON FUNCTION public.sop_auto_assign(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sop_auto_assign() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.sop_validate_transition(uuid,public.sop_lead_stage)'::regprocedure,
    'public.sop_assign_lead(uuid,uuid,text)'::regprocedure,
    'public.sop_claim_lead(uuid)'::regprocedure,
    'public.sop_reassign_lead(uuid,uuid,text)'::regprocedure,
    'public.sop_acknowledge_assignment(uuid)'::regprocedure,
    'public.sop_advance_lead(uuid,public.sop_lead_stage,text)'::regprocedure,
    'public.sop_disqualify(uuid,text,text)'::regprocedure,
    'public.sop_reopen_lead(uuid)'::regprocedure,
    'public.sop_create_pricing_request(uuid,text)'::regprocedure,
    'public.sop_request_recheck(uuid,text)'::regprocedure,
    'public.sop_move_back(uuid,public.sop_lead_stage,text)'::regprocedure,
    'public.sop_complete_recheck(uuid,boolean,text)'::regprocedure,
    'public.sop_return_to_sales(uuid)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- Workflow and audit tables are read-only through the Data API. Every mutation
-- now goes through an explicitly authorized function above.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.sop_leads FROM anon, authenticated;
REVOKE ALL ON public.sop_lead_assignments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.sop_lead_assignments FROM authenticated;
REVOKE ALL ON public.sop_lead_stage_history FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.sop_lead_stage_history FROM authenticated;
REVOKE ALL ON public.sop_lead_activities FROM anon, authenticated;
GRANT SELECT ON public.sop_lead_activities TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_sop_lead_workflow_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
    NEW.stage IS DISTINCT FROM OLD.stage
    OR NEW.owner_department IS DISTINCT FROM OLD.owner_department
    OR NEW.current_owner_id IS DISTINCT FROM OLD.current_owner_id
    OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
    OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
    OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
    OR NEW.first_response_at IS DISTINCT FROM OLD.first_response_at
    OR NEW.intake_completed_at IS DISTINCT FROM OLD.intake_completed_at
    OR NEW.next_follow_up_at IS DISTINCT FROM OLD.next_follow_up_at
    OR NEW.last_contact_at IS DISTINCT FROM OLD.last_contact_at
    OR NEW.converted_at IS DISTINCT FROM OLD.converted_at
    OR NEW.converted_by IS DISTINCT FROM OLD.converted_by
    OR NEW.lost_reason IS DISTINCT FROM OLD.lost_reason
    OR NEW.requote_required IS DISTINCT FROM OLD.requote_required
  ) THEN
    RAISE EXCEPTION 'استخدم إجراءات سير العمل المعتمدة لتغيير مرحلة أو مسؤول العميل المحتمل';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_sop_lead_workflow_fields() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sop_lead_activities;
  EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
  END;
END $$;
