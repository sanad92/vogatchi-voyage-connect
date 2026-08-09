
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.sop_department AS ENUM ('customer_service','sales','reservations','operations','management');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_lead_stage AS ENUM (
    'new','qualified','assigned','pricing_requested','quoted','follow_up',
    'accepted_pending_recheck','rechecked','payment_pending','won','lost','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_handover_type AS ENUM ('cs_to_sales','sales_to_reservations','reservations_to_sales','reservations_to_cs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_approval_type AS ENUM ('discount','free_service','booking_confirmation','supplier_payment','refund_compensation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_deadline_type AS ENUM ('payment','cancellation','release','pre_arrival','reconfirmation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_pricing_status AS ENUM ('requested','in_progress','quoted','requoted','recheck','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ DEPARTMENT MEMBERSHIP ============
CREATE TABLE IF NOT EXISTS public.sop_department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  department public.sop_department NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  specializations text[] NOT NULL DEFAULT '{}',
  last_assigned_at timestamptz,
  active_load integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, department)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_department_members TO authenticated;
GRANT ALL ON public.sop_department_members TO service_role;
ALTER TABLE public.sop_department_members ENABLE ROW LEVEL SECURITY;

-- ============ ORG POLICIES ============
CREATE TABLE IF NOT EXISTS public.sop_org_policies (
  organization_id uuid PRIMARY KEY,
  assignment_ack_sla_minutes integer NOT NULL DEFAULT 30,
  first_response_sla_minutes integer NOT NULL DEFAULT 15,
  incident_update_sla_minutes integer NOT NULL DEFAULT 120,
  quotation_turnaround_sla_minutes integer NOT NULL DEFAULT 240,
  default_collection_policy text NOT NULL DEFAULT 'full',
  default_deposit_percent numeric NOT NULL DEFAULT 30,
  pre_arrival_days integer NOT NULL DEFAULT 3,
  post_trip_days integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sop_org_policies TO authenticated;
GRANT ALL ON public.sop_org_policies TO service_role;
ALTER TABLE public.sop_org_policies ENABLE ROW LEVEL SECURITY;

-- ============ LEADS ============
CREATE TABLE IF NOT EXISTS public.sop_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_number text,
  stage public.sop_lead_stage NOT NULL DEFAULT 'new',
  owner_department public.sop_department NOT NULL DEFAULT 'customer_service',
  current_owner_id uuid,
  customer_id uuid,
  conversation_id uuid,
  quote_id uuid,
  booking_id uuid,
  contact_name text,
  contact_phone text,
  contact_email text,
  destination text,
  city text,
  check_in date,
  check_out date,
  approx_dates text,
  adults integer,
  children_count integer NOT NULL DEFAULT 0,
  children_ages jsonb NOT NULL DEFAULT '[]'::jsonb,
  rooms integer,
  occupancy text,
  service_type text,
  nationality text,
  market text,
  budget_level text,
  budget_amount numeric,
  priorities text,
  reference_hotel text,
  reference_screenshot_url text,
  special_requests text,
  lead_source text,
  campaign text,
  arrived_at timestamptz NOT NULL DEFAULT now(),
  first_response_at timestamptz,
  intake_completed_at timestamptz,
  payment_policy text NOT NULL DEFAULT 'full',
  deposit_percent numeric,
  lost_reason text,
  requote_required boolean NOT NULL DEFAULT false,
  is_legacy boolean NOT NULL DEFAULT false,
  migration_source text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sop_leads_org_stage ON public.sop_leads(organization_id, stage) WHERE is_legacy = false;
CREATE INDEX IF NOT EXISTS idx_sop_leads_booking ON public.sop_leads(booking_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_leads TO authenticated;
GRANT ALL ON public.sop_leads TO service_role;
ALTER TABLE public.sop_leads ENABLE ROW LEVEL SECURITY;

-- ============ ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.sop_lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL,
  assigned_by uuid,
  method text NOT NULL DEFAULT 'round_robin',
  exception_reason text,
  reassignment_reason text,
  previous_assignee_id uuid,
  ack_deadline_at timestamptz,
  acknowledged_at timestamptz,
  released_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sop_assign_lead ON public.sop_lead_assignments(lead_id, is_current);
GRANT SELECT, INSERT, UPDATE ON public.sop_lead_assignments TO authenticated;
GRANT ALL ON public.sop_lead_assignments TO service_role;
ALTER TABLE public.sop_lead_assignments ENABLE ROW LEVEL SECURITY;

-- ============ PRICING REQUESTS ============
CREATE TABLE IF NOT EXISTS public.sop_pricing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  customer_id uuid,
  quote_id uuid,
  booking_id uuid,
  status public.sop_pricing_status NOT NULL DEFAULT 'requested',
  requested_by uuid,
  assigned_to uuid,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  recommendation text,
  price_valid_until date,
  recheck_requested_at timestamptz,
  recheck_completed_at timestamptz,
  recheck_changed boolean,
  recheck_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  quoted_at timestamptz,
  is_legacy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sop_pricing_requests TO authenticated;
GRANT ALL ON public.sop_pricing_requests TO service_role;
ALTER TABLE public.sop_pricing_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sop_pricing_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  pricing_request_id uuid NOT NULL REFERENCES public.sop_pricing_requests(id) ON DELETE CASCADE,
  option_index integer NOT NULL DEFAULT 1,
  supplier_id uuid,
  supplier_name text,
  product_name text,
  net_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  markup_type text NOT NULL DEFAULT 'percent',
  markup_value numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  cancellation_policy text,
  payment_deadline date,
  cancellation_deadline date,
  release_deadline date,
  is_recommended boolean NOT NULL DEFAULT false,
  is_selected boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricing_request_id, option_index)
);
ALTER TABLE public.sop_pricing_options ADD CONSTRAINT sop_pricing_options_max3 CHECK (option_index BETWEEN 1 AND 3);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_pricing_options TO authenticated;
GRANT ALL ON public.sop_pricing_options TO service_role;
ALTER TABLE public.sop_pricing_options ENABLE ROW LEVEL SECURITY;

-- ============ HANDOVERS ============
CREATE TABLE IF NOT EXISTS public.sop_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  handover_type public.sop_handover_type NOT NULL,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  booking_id uuid,
  from_user_id uuid,
  to_user_id uuid,
  from_department public.sop_department,
  to_department public.sop_department,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_items text[] NOT NULL DEFAULT '{}',
  is_complete boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sop_handovers_lead ON public.sop_handovers(lead_id, handover_type);
GRANT SELECT, INSERT, UPDATE ON public.sop_handovers TO authenticated;
GRANT ALL ON public.sop_handovers TO service_role;
ALTER TABLE public.sop_handovers ENABLE ROW LEVEL SECURITY;

-- ============ APPROVALS ============
CREATE TABLE IF NOT EXISTS public.sop_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  approval_type public.sop_approval_type NOT NULL,
  status public.sop_approval_status NOT NULL DEFAULT 'pending',
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  booking_id uuid,
  quote_id uuid,
  supplier_payment_order_id uuid,
  amount numeric,
  reason text,
  requested_by uuid,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sop_approvals_scope ON public.sop_approvals(organization_id, approval_type, status);
GRANT SELECT, INSERT, UPDATE ON public.sop_approvals TO authenticated;
GRANT ALL ON public.sop_approvals TO service_role;
ALTER TABLE public.sop_approvals ENABLE ROW LEVEL SECURITY;

-- ============ DEADLINES ============
CREATE TABLE IF NOT EXISTS public.sop_operational_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  deadline_type public.sop_deadline_type NOT NULL,
  booking_id uuid,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  pricing_request_id uuid,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  owner_id uuid,
  alerted_at timestamptz,
  completed_at timestamptz,
  notes text,
  is_legacy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sop_deadlines_due ON public.sop_operational_deadlines(organization_id, status, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_operational_deadlines TO authenticated;
GRANT ALL ON public.sop_operational_deadlines TO service_role;
ALTER TABLE public.sop_operational_deadlines ENABLE ROW LEVEL SECURITY;

-- ============ INCIDENTS ============
CREATE TABLE IF NOT EXISTS public.sop_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  owner_id uuid,
  booking_id uuid,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE SET NULL,
  customer_id uuid,
  next_update_at timestamptz,
  escalation_level integer NOT NULL DEFAULT 0,
  escalated_to public.sop_department,
  resolution text,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sop_incidents TO authenticated;
GRANT ALL ON public.sop_incidents TO service_role;
ALTER TABLE public.sop_incidents ENABLE ROW LEVEL SECURITY;

-- ============ POST TRIP ============
CREATE TABLE IF NOT EXISTS public.sop_post_trip_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  customer_id uuid,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  rating integer,
  feedback text,
  owner_id uuid,
  is_legacy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sop_post_trip_actions TO authenticated;
GRANT ALL ON public.sop_post_trip_actions TO service_role;
ALTER TABLE public.sop_post_trip_actions ENABLE ROW LEVEL SECURITY;

-- ============ BOOKING PAYMENT POLICY ============
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_policy text NOT NULL DEFAULT 'full';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_percent numeric;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.sop_is_manager(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = _user AND m.is_active
      AND m.role IN ('owner','admin','manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.sop_has_department(_org uuid, _user uuid, _dept public.sop_department)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sop_department_members d
    WHERE d.organization_id = _org AND d.user_id = _user AND d.department = _dept
  ) OR public.sop_is_manager(_org, _user);
$$;

REVOKE EXECUTE ON FUNCTION public.sop_is_manager(uuid,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_has_department(uuid,uuid,public.sop_department) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_is_manager(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sop_has_department(uuid,uuid,public.sop_department) TO authenticated, service_role;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sop_department_members','sop_org_policies','sop_leads','sop_lead_assignments',
    'sop_pricing_requests','sop_pricing_options','sop_handovers','sop_approvals',
    'sop_operational_deadlines','sop_incidents','sop_post_trip_actions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ============ RLS POLICIES ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sop_department_members','sop_org_policies','sop_leads','sop_lead_assignments',
    'sop_pricing_requests','sop_pricing_options','sop_handovers','sop_approvals',
    'sop_operational_deadlines','sop_incidents','sop_post_trip_actions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_org_read" ON public.%I FOR SELECT TO authenticated USING (public.user_belongs_to_org(organization_id, auth.uid()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_org_write" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(organization_id, auth.uid()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_org_update" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_org_update" ON public.%I FOR UPDATE TO authenticated USING (public.user_belongs_to_org(organization_id, auth.uid())) WITH CHECK (public.user_belongs_to_org(organization_id, auth.uid()))', t, t);
  END LOOP;
END $$;

-- delete limited to managers where enabled
CREATE POLICY "sop_leads_mgr_delete" ON public.sop_leads FOR DELETE TO authenticated
  USING (public.sop_is_manager(organization_id, auth.uid()));
CREATE POLICY "sop_dept_mgr_delete" ON public.sop_department_members FOR DELETE TO authenticated
  USING (public.sop_is_manager(organization_id, auth.uid()));
CREATE POLICY "sop_options_delete" ON public.sop_pricing_options FOR DELETE TO authenticated
  USING (public.sop_has_department(organization_id, auth.uid(), 'reservations'));
CREATE POLICY "sop_deadlines_delete" ON public.sop_operational_deadlines FOR DELETE TO authenticated
  USING (public.sop_is_manager(organization_id, auth.uid()));

-- Only reservations/management may write supplier cost & selling fields
CREATE OR REPLACE FUNCTION public.sop_guard_pricing_option()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.sop_has_department(NEW.organization_id, auth.uid(), 'reservations') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'SOP: only Reservations may create pricing options';
  END IF;
  IF NEW.net_cost IS DISTINCT FROM OLD.net_cost
     OR NEW.selling_price IS DISTINCT FROM OLD.selling_price
     OR NEW.markup_value IS DISTINCT FROM OLD.markup_value
     OR NEW.markup_type IS DISTINCT FROM OLD.markup_type
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.cancellation_policy IS DISTINCT FROM OLD.cancellation_policy THEN
    RAISE EXCEPTION 'SOP: only Reservations may change supplier cost, policy or selling price';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sop_guard_pricing_option ON public.sop_pricing_options;
CREATE TRIGGER trg_sop_guard_pricing_option BEFORE INSERT OR UPDATE ON public.sop_pricing_options
FOR EACH ROW EXECUTE FUNCTION public.sop_guard_pricing_option();

-- ============ BACKFILL (legacy) ============
INSERT INTO public.sop_leads (
  organization_id, stage, owner_department, customer_id, quote_id, booking_id,
  contact_name, destination, check_in, check_out, adults, is_legacy, migration_source,
  current_owner_id, created_at, arrived_at, intake_completed_at)
SELECT b.organization_id,
       CASE WHEN b.workflow_stage = 'cancelled' THEN 'lost'::public.sop_lead_stage ELSE 'won'::public.sop_lead_stage END,
       'operations', b.customer_id, b.quote_id, b.id,
       b.customer_name, NULL, b.start_date, b.end_date, NULL, true, 'historical',
       b.employee_id, COALESCE(b.created_at, now()), COALESCE(b.created_at, now()), COALESCE(b.created_at, now())
FROM public.bookings b
WHERE NOT EXISTS (SELECT 1 FROM public.sop_leads l WHERE l.booking_id = b.id);
