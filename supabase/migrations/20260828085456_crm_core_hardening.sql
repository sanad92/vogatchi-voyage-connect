-- CRM core hardening: permission parity, tenant isolation, truthful metrics,
-- safe duplicate handling, and atomic loyalty redemption.

CREATE OR REPLACE FUNCTION public.has_org_permission(_org_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.organization_id = _org_id
        AND member.user_id = auth.uid()
        AND member.is_active = true
        AND (
          member.role::text IN ('owner', 'admin')
          OR (
            member.role::text = 'manager'
            AND _permission = ANY (ARRAY[
              'customers_view','customers_create','customers_edit','customers_export',
              'crm_view','crm_create','crm_edit','crm_follow_ups','crm_campaigns','crm_segments'
            ])
          )
          OR (
            member.role::text = 'viewer'
            AND _permission = ANY (ARRAY['customers_view','crm_view'])
          )
          OR (
            member.role::text = 'agent'
            AND (
              _permission = ANY (ARRAY['team_view','documents_view'])
              OR EXISTS (
                SELECT 1
                FROM public.sop_department_members AS department
                WHERE department.organization_id = _org_id
                  AND department.user_id = auth.uid()
                  AND CASE department.department::text
                    WHEN 'customer_service' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit',
                      'crm_view','crm_create','crm_edit','crm_follow_ups'
                    ])
                    WHEN 'sales' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit',
                      'crm_view','crm_create','crm_edit','crm_follow_ups'
                    ])
                    WHEN 'reservations' THEN _permission = ANY (ARRAY['customers_view','crm_view'])
                    WHEN 'operations' THEN _permission = 'customers_view'
                    WHEN 'finance' THEN _permission = 'customers_view'
                    WHEN 'marketing' THEN _permission = ANY (ARRAY[
                      'customers_view','crm_view','crm_create','crm_edit','crm_campaigns','crm_segments'
                    ])
                    WHEN 'management' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit','customers_export',
                      'crm_view','crm_create','crm_edit','crm_follow_ups','crm_campaigns','crm_segments'
                    ])
                    ELSE false
                  END
              )
            )
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.has_org_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_customers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.user_id = auth.uid()
        AND member.is_active = true
        AND (
          public.has_org_permission(member.organization_id, 'customers_create')
          OR public.has_org_permission(member.organization_id, 'customers_edit')
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_customers() TO authenticated;

-- Normalize common Egyptian local/international mobile forms before comparison.
CREATE OR REPLACE FUNCTION public.normalize_phone_digits(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  value text := NULLIF(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), '');
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  IF value LIKE '00%' THEN value := substring(value FROM 3); END IF;
  IF length(value) = 11 AND value LIKE '01%' THEN
    RETURN '20' || substring(value FROM 2);
  END IF;
  IF length(value) = 10 AND substring(value FROM 1 FOR 2) IN ('10','11','12','15') THEN
    RETURN '20' || value;
  END IF;
  RETURN value;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.phone IS NOT DISTINCT FROM OLD.phone
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN
    RETURN NEW;
  END IF;

  normalized := public.normalize_phone_digits(NEW.phone);
  IF normalized IS NULL OR length(normalized) < 6 THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.organization_id::text || ':' || normalized, 0));
  IF EXISTS (
    SELECT 1
    FROM public.customers AS customer
    WHERE customer.organization_id = NEW.organization_id
      AND customer.id <> NEW.id
      AND public.normalize_phone_digits(customer.phone) = normalized
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'رقم الهاتف مسجل بالفعل لعميل آخر داخل المؤسسة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_customer_phone_trigger ON public.customers;
CREATE TRIGGER prevent_duplicate_customer_phone_trigger
BEFORE INSERT OR UPDATE OF phone, organization_id ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_customer_phone();

ALTER TABLE public.customers
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_name_nonblank;
ALTER TABLE public.customers ADD CONSTRAINT customers_name_nonblank
  CHECK (btrim(name) <> '') NOT VALID;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_loyalty_nonnegative;
ALTER TABLE public.customers ADD CONSTRAINT customers_loyalty_nonnegative
  CHECK (COALESCE(loyalty_points, 0) >= 0) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_customer_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NULLIF(btrim(NEW.name), '') IS NULL THEN RAISE EXCEPTION 'اسم العميل مطلوب'; END IF;
  IF (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone OR NEW.email IS DISTINCT FROM OLD.email)
     AND NULLIF(btrim(NEW.phone), '') IS NULL
     AND NULLIF(btrim(NEW.email), '') IS NULL THEN
    RAISE EXCEPTION 'يجب إدخال رقم هاتف أو بريد إلكتروني للعميل';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_customer_identity_trigger ON public.customers;
CREATE TRIGGER validate_customer_identity_trigger
BEFORE INSERT OR UPDATE OF name, phone, email ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_identity();

CREATE OR REPLACE FUNCTION public.enforce_customer_child_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_org uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'يجب تحديد العميل'; END IF;
  SELECT organization_id INTO customer_org FROM public.customers WHERE id = NEW.customer_id;
  IF customer_org IS NULL THEN RAISE EXCEPTION 'العميل غير موجود'; END IF;
  IF NEW.organization_id IS NULL THEN NEW.organization_id := customer_org; END IF;
  IF NEW.organization_id <> customer_org THEN RAISE EXCEPTION 'العميل لا ينتمي إلى المؤسسة المحددة'; END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customer_communications','customer_follow_ups','customer_notes',
    'customer_satisfaction','loyalty_points'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforce_customer_child_organization_trigger ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER enforce_customer_child_organization_trigger BEFORE INSERT OR UPDATE OF customer_id, organization_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_child_organization()',
      table_name
    );
  END LOOP;
END;
$$;

UPDATE public.customer_communications AS child SET organization_id = customer.organization_id
FROM public.customers AS customer WHERE child.customer_id = customer.id AND child.organization_id IS NULL;
UPDATE public.customer_follow_ups AS child SET organization_id = customer.organization_id
FROM public.customers AS customer WHERE child.customer_id = customer.id AND child.organization_id IS NULL;
UPDATE public.customer_notes AS child SET organization_id = customer.organization_id
FROM public.customers AS customer WHERE child.customer_id = customer.id AND child.organization_id IS NULL;
UPDATE public.customer_satisfaction AS child SET organization_id = customer.organization_id
FROM public.customers AS customer WHERE child.customer_id = customer.id AND child.organization_id IS NULL;
UPDATE public.loyalty_points AS child SET organization_id = customer.organization_id
FROM public.customers AS customer WHERE child.customer_id = customer.id AND child.organization_id IS NULL;

ALTER TABLE public.customer_communications ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.customer_follow_ups ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.customer_notes ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.customer_satisfaction ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.loyalty_points ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.customer_segments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.loyalty_rewards ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.marketing_campaigns ALTER COLUMN organization_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_segments_org_name_unique
  ON public.customer_segments (organization_id, lower(btrim(name)));

ALTER TABLE public.customer_segments DROP CONSTRAINT IF EXISTS customer_segments_thresholds_nonnegative;
ALTER TABLE public.customer_segments ADD CONSTRAINT customer_segments_thresholds_nonnegative
  CHECK (COALESCE(minimum_bookings, 0) >= 0 AND COALESCE(minimum_total_spent, 0) >= 0) NOT VALID;
ALTER TABLE public.customer_follow_ups DROP CONSTRAINT IF EXISTS customer_follow_ups_status_valid;
ALTER TABLE public.customer_follow_ups ADD CONSTRAINT customer_follow_ups_status_valid
  CHECK (status IN ('pending','completed','cancelled')) NOT VALID;
ALTER TABLE public.customer_follow_ups DROP CONSTRAINT IF EXISTS customer_follow_ups_priority_valid;
ALTER TABLE public.customer_follow_ups ADD CONSTRAINT customer_follow_ups_priority_valid
  CHECK (priority IN ('low','normal','high','urgent')) NOT VALID;
ALTER TABLE public.customer_communications DROP CONSTRAINT IF EXISTS customer_communications_direction_valid;
ALTER TABLE public.customer_communications ADD CONSTRAINT customer_communications_direction_valid
  CHECK (direction IN ('incoming','outgoing','inbound','outbound')) NOT VALID;
ALTER TABLE public.customer_satisfaction DROP CONSTRAINT IF EXISTS customer_satisfaction_ratings_valid;
ALTER TABLE public.customer_satisfaction ADD CONSTRAINT customer_satisfaction_ratings_valid CHECK (
  (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5)
  AND (service_rating IS NULL OR service_rating BETWEEN 1 AND 5)
  AND (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5)
) NOT VALID;
ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_type_valid;
ALTER TABLE public.marketing_campaigns ADD CONSTRAINT marketing_campaigns_type_valid
  CHECK (campaign_type IN ('email','whatsapp','sms')) NOT VALID;
ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_status_valid;
ALTER TABLE public.marketing_campaigns ADD CONSTRAINT marketing_campaigns_status_valid
  CHECK (status IN ('draft','active','completed','paused')) NOT VALID;
ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_dates_valid;
ALTER TABLE public.marketing_campaigns ADD CONSTRAINT marketing_campaigns_dates_valid
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date) NOT VALID;
ALTER TABLE public.sop_leads DROP CONSTRAINT IF EXISTS sop_leads_dates_valid;
ALTER TABLE public.sop_leads ADD CONSTRAINT sop_leads_dates_valid
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in) NOT VALID;

CREATE OR REPLACE FUNCTION public.enforce_customer_segment_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE segment_org uuid;
BEGIN
  IF NEW.segment_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO segment_org FROM public.customer_segments WHERE id = NEW.segment_id;
  IF segment_org IS NULL OR segment_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'شريحة العميل لا تنتمي إلى المؤسسة المحددة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_customer_segment_organization_trigger ON public.customers;
CREATE TRIGGER enforce_customer_segment_organization_trigger
BEFORE INSERT OR UPDATE OF segment_id, organization_id ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_segment_organization();

CREATE OR REPLACE FUNCTION public.enforce_campaign_segment_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE segment_org uuid;
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.target_segment_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO segment_org FROM public.customer_segments WHERE id = NEW.target_segment_id;
  IF segment_org IS NULL OR segment_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'شريحة الحملة لا تنتمي إلى المؤسسة المحددة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_campaign_segment_organization_trigger ON public.marketing_campaigns;
CREATE TRIGGER enforce_campaign_segment_organization_trigger
BEFORE INSERT OR UPDATE OF target_segment_id, organization_id ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_segment_organization();

CREATE OR REPLACE FUNCTION public.crm_customer_booking_metrics(_org_id uuid)
RETURNS TABLE (
  customer_id uuid,
  total_bookings bigint,
  last_booking_date date,
  spend_by_currency jsonb,
  booking_count_by_currency jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_org_permission(_org_id, 'customers_view') THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض بيانات عملاء هذه المؤسسة';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT booking.customer_id,
           COALESCE(NULLIF(upper(btrim(booking.currency)), ''), 'EGP') AS currency,
           COALESCE(booking.selling_price, 0) AS selling_price,
           booking.created_at
    FROM public.bookings AS booking
    WHERE booking.organization_id = _org_id
      AND booking.customer_id IS NOT NULL
      AND booking.is_demo = false
      AND (
        lower(COALESCE(booking.status, '')) IN ('confirmed','completed','paid')
        OR booking.workflow_stage::text IN ('paid','operations','traveling','completed','post_travel')
      )
  ), by_currency AS (
    SELECT eligible.customer_id, eligible.currency,
           count(*)::bigint AS booking_count,
           sum(eligible.selling_price)::numeric AS total_spent,
           max(eligible.created_at)::date AS last_booking_date
    FROM eligible
    GROUP BY eligible.customer_id, eligible.currency
  )
  SELECT by_currency.customer_id,
         sum(by_currency.booking_count)::bigint,
         max(by_currency.last_booking_date),
         jsonb_object_agg(by_currency.currency, by_currency.total_spent),
         jsonb_object_agg(by_currency.currency, by_currency.booking_count)
  FROM by_currency
  GROUP BY by_currency.customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_customer_booking_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_customer_booking_metrics(uuid) TO authenticated;

COMMENT ON COLUMN public.customers.total_spent IS
  'Legacy EGP-only confirmed booking total. Use crm_customer_booking_metrics for currency-safe totals.';

CREATE OR REPLACE FUNCTION public.refresh_customer_booking_summary(_customer_id uuid, _org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE summary record;
BEGIN
  IF _customer_id IS NULL OR _org_id IS NULL THEN RETURN; END IF;
  SELECT count(*)::integer AS total_bookings,
         max(booking.created_at)::date AS last_booking_date,
         COALESCE(sum(booking.selling_price) FILTER (
           WHERE COALESCE(NULLIF(upper(btrim(booking.currency)), ''), 'EGP') = 'EGP'
         ), 0)::numeric AS total_spent
  INTO summary
  FROM public.bookings AS booking
  WHERE booking.organization_id = _org_id
    AND booking.customer_id = _customer_id
    AND booking.is_demo = false
    AND (
      lower(COALESCE(booking.status, '')) IN ('confirmed','completed','paid')
      OR booking.workflow_stage::text IN ('paid','operations','traveling','completed','post_travel')
    );

  UPDATE public.customers
  SET total_bookings = COALESCE(summary.total_bookings, 0),
      total_spent = COALESCE(summary.total_spent, 0),
      last_booking_date = summary.last_booking_date,
      updated_at = now()
  WHERE id = _customer_id AND organization_id = _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_customer_booking_summary(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_booking_refresh_customer_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.refresh_customer_booking_summary(OLD.customer_id, OLD.organization_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF TG_OP = 'INSERT'
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.selling_price IS DISTINCT FROM OLD.selling_price
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
      PERFORM public.refresh_customer_booking_summary(NEW.customer_id, NEW.organization_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_booking_refresh_customer_summary_trigger ON public.bookings;
CREATE TRIGGER on_booking_refresh_customer_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.on_booking_refresh_customer_summary();

UPDATE public.customers
SET total_bookings = 0, total_spent = 0, last_booking_date = NULL;

WITH summary AS (
  SELECT booking.organization_id, booking.customer_id,
         count(*)::integer AS total_bookings,
         max(booking.created_at)::date AS last_booking_date,
         COALESCE(sum(booking.selling_price) FILTER (
           WHERE COALESCE(NULLIF(upper(btrim(booking.currency)), ''), 'EGP') = 'EGP'
         ), 0)::numeric AS total_spent
  FROM public.bookings AS booking
  WHERE booking.customer_id IS NOT NULL
    AND booking.is_demo = false
    AND (
      lower(COALESCE(booking.status, '')) IN ('confirmed','completed','paid')
      OR booking.workflow_stage::text IN ('paid','operations','traveling','completed','post_travel')
    )
  GROUP BY booking.organization_id, booking.customer_id
)
UPDATE public.customers AS customer
SET total_bookings = summary.total_bookings,
    total_spent = summary.total_spent,
    last_booking_date = summary.last_booking_date
FROM summary
WHERE customer.organization_id = summary.organization_id
  AND customer.id = summary.customer_id;

CREATE OR REPLACE FUNCTION public.sync_customer_last_follow_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.customers
    SET last_follow_up_date = COALESCE(NEW.completed_at, now()),
        last_follow_up_by = COALESCE(NEW.assigned_to, auth.uid()),
        updated_at = now()
    WHERE id = NEW.customer_id AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_customer_last_follow_up_trigger ON public.customer_follow_ups;
CREATE TRIGGER sync_customer_last_follow_up_trigger
AFTER INSERT OR UPDATE OF status, completed_at ON public.customer_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_last_follow_up();

-- Remove permissive legacy policies; policy expressions are ORed, so leaving one
-- broad ALL policy would bypass the role-specific rules below.
DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'customers','customer_segments','customer_follow_ups','customer_communications',
        'customer_notes','customer_satisfaction','loyalty_points','loyalty_rewards',
        'marketing_campaigns','sop_leads'
      ])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END;
$$;

CREATE POLICY customers_select_by_permission ON public.customers FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'customers_view'));
CREATE POLICY customers_insert_by_permission ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'customers_create'));
CREATE POLICY customers_update_by_permission ON public.customers FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'customers_edit'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'customers_edit'));
CREATE POLICY customers_delete_by_permission ON public.customers FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND (
    public.is_platform_admin(auth.uid()) OR public.get_user_org_role(auth.uid(), organization_id)::text IN ('owner','admin')
  ));

CREATE POLICY customer_segments_select_by_permission ON public.customer_segments FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'customers_view'));
CREATE POLICY customer_segments_insert_by_permission ON public.customer_segments FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));
CREATE POLICY customer_segments_update_by_permission ON public.customer_segments FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));
CREATE POLICY customer_segments_delete_by_permission ON public.customer_segments FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customer_follow_ups','customer_communications','customer_notes','customer_satisfaction'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, ''customers_view''))',
      table_name || '_select_by_permission', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, ''crm_follow_ups''))',
      table_name || '_insert_by_permission', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, ''crm_follow_ups'')) WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, ''crm_follow_ups''))',
      table_name || '_update_by_permission', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, ''crm_follow_ups''))',
      table_name || '_delete_by_permission', table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY loyalty_points_select_by_permission ON public.loyalty_points FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'customers_view'));
CREATE POLICY loyalty_points_insert_by_permission ON public.loyalty_points FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'));
CREATE POLICY loyalty_points_update_by_permission ON public.loyalty_points FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'));
CREATE POLICY loyalty_points_delete_by_permission ON public.loyalty_points FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'));

CREATE POLICY loyalty_rewards_select_by_permission ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'crm_view'));
CREATE POLICY loyalty_rewards_insert_by_permission ON public.loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));
CREATE POLICY loyalty_rewards_update_by_permission ON public.loyalty_rewards FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));
CREATE POLICY loyalty_rewards_delete_by_permission ON public.loyalty_rewards FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_segments'));

CREATE POLICY marketing_campaigns_select_by_permission ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'crm_view'));
CREATE POLICY marketing_campaigns_insert_by_permission ON public.marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));
CREATE POLICY marketing_campaigns_update_by_permission ON public.marketing_campaigns FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));
CREATE POLICY marketing_campaigns_delete_by_permission ON public.marketing_campaigns FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));

CREATE POLICY sop_leads_select_by_permission ON public.sop_leads FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'crm_view'));
CREATE POLICY sop_leads_insert_by_permission ON public.sop_leads FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_create'));
CREATE POLICY sop_leads_update_by_permission ON public.sop_leads FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_edit'));
CREATE POLICY sop_leads_delete_by_permission ON public.sop_leads FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND (
    public.is_platform_admin(auth.uid()) OR public.get_user_org_role(auth.uid(), organization_id)::text IN ('owner','admin','manager')
  ));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers','customer_segments','customer_follow_ups','customer_communications',
    'customer_notes','customer_satisfaction','loyalty_points','loyalty_rewards',
    'marketing_campaigns','sop_leads'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_duplicate_customers(_org_id uuid)
RETURNS TABLE(normalized_phone text, customer_count bigint, customer_ids uuid[], names text[], emails text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_org_permission(_org_id, 'customers_view') THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض عملاء هذه المؤسسة';
  END IF;
  RETURN QUERY
  SELECT public.normalize_phone_digits(customer.phone),
         count(*)::bigint,
         array_agg(customer.id ORDER BY customer.created_at),
         array_agg(COALESCE(customer.name, '') ORDER BY customer.created_at),
         array_agg(COALESCE(customer.email, '') ORDER BY customer.created_at)
  FROM public.customers AS customer
  WHERE customer.organization_id = _org_id
    AND public.normalize_phone_digits(customer.phone) IS NOT NULL
    AND length(public.normalize_phone_digits(customer.phone)) >= 6
  GROUP BY public.normalize_phone_digits(customer.phone)
  HAVING count(*) > 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_customers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_duplicate_customers(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(_customer_id uuid, _reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_row public.customers%ROWTYPE;
  reward_row public.loyalty_rewards%ROWTYPE;
  new_balance integer;
BEGIN
  SELECT * INTO customer_row FROM public.customers WHERE id = _customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل غير موجود'; END IF;
  IF NOT public.can_org_write(customer_row.organization_id)
     OR NOT public.has_org_permission(customer_row.organization_id, 'crm_edit') THEN
    RAISE EXCEPTION 'غير مصرح لك باسترداد نقاط هذا العميل';
  END IF;

  SELECT * INTO reward_row
  FROM public.loyalty_rewards
  WHERE id = _reward_id
    AND organization_id = customer_row.organization_id
    AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'المكافأة غير متاحة'; END IF;
  IF COALESCE(reward_row.points_required, 0) <= 0 THEN RAISE EXCEPTION 'عدد نقاط المكافأة غير صالح'; END IF;
  IF COALESCE(customer_row.loyalty_points, 0) < reward_row.points_required THEN RAISE EXCEPTION 'رصيد النقاط غير كاف'; END IF;

  new_balance := customer_row.loyalty_points - reward_row.points_required;
  UPDATE public.customers SET loyalty_points = new_balance, updated_at = now()
  WHERE id = customer_row.id;
  INSERT INTO public.loyalty_points (
    organization_id, customer_id, points_earned, points_used, current_balance,
    transaction_type, description
  ) VALUES (
    customer_row.organization_id, customer_row.id, 0, reward_row.points_required, new_balance,
    'redeemed', 'استرداد مكافأة: ' || COALESCE(reward_row.name_ar, reward_row.name)
  );

  RETURN jsonb_build_object(
    'success', true, 'customer_id', customer_row.id, 'reward_id', reward_row.id,
    'points_used', reward_row.points_required, 'current_balance', new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.merge_customers(_org_id uuid, _keep_id uuid, _merge_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merge_ids uuid[];
  moved_bookings integer := 0;
  deleted_customers integer := 0;
  preserved_points integer := 0;
BEGIN
  IF NOT public.can_org_write(_org_id)
     OR NOT (public.is_platform_admin(auth.uid()) OR public.get_user_org_role(auth.uid(), _org_id)::text IN ('owner','admin')) THEN
    RAISE EXCEPTION 'غير مصرح لك بدمج العملاء';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _keep_id AND organization_id = _org_id) THEN
    RAISE EXCEPTION 'العميل الأساسي غير موجود في المؤسسة';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO merge_ids
  FROM public.customers
  WHERE organization_id = _org_id AND id = ANY(COALESCE(_merge_ids, ARRAY[]::uuid[])) AND id <> _keep_id;
  IF cardinality(merge_ids) = 0 THEN RAISE EXCEPTION 'لم يتم تحديد عملاء صالحين للدمج'; END IF;

  SELECT COALESCE(sum(loyalty_points), 0)::integer INTO preserved_points
  FROM public.customers WHERE organization_id = _org_id AND id = ANY(merge_ids);
  UPDATE public.customers SET loyalty_points = COALESCE(loyalty_points, 0) + preserved_points WHERE id = _keep_id;

  UPDATE public.bookings SET customer_id = _keep_id, updated_at = now() WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  GET DIAGNOSTICS moved_bookings = ROW_COUNT;
  UPDATE public.invoices SET customer_id = _keep_id, updated_at = now() WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.quotes SET customer_id = _keep_id, updated_at = now() WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.customer_payments SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.customer_communications SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.customer_follow_ups SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.customer_notes SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.customer_satisfaction SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.loyalty_points SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.sop_leads SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.refund_requests SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.generated_documents SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.whatsapp_conversations SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.whatsapp_broadcast_recipients SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.hotel_bookings SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.flight_bookings SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.transport_bookings SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;
  UPDATE public.car_rentals SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;

  DELETE FROM public.campaign_sends AS send
  WHERE send.customer_id = ANY(merge_ids) AND send.organization_id = _org_id
    AND EXISTS (SELECT 1 FROM public.campaign_sends AS kept WHERE kept.campaign_id = send.campaign_id AND kept.customer_id = _keep_id);
  UPDATE public.campaign_sends SET customer_id = _keep_id WHERE customer_id = ANY(merge_ids) AND organization_id = _org_id;

  DELETE FROM public.customers WHERE organization_id = _org_id AND id = ANY(merge_ids);
  GET DIAGNOSTICS deleted_customers = ROW_COUNT;
  PERFORM public.refresh_customer_booking_summary(_keep_id, _org_id);

  RETURN jsonb_build_object(
    'success', true, 'kept_customer_id', _keep_id,
    'bookings_moved', moved_bookings, 'customers_deleted', deleted_customers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_customers(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_customers(uuid, uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_sop_lead_workflow_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
    NEW.stage IS DISTINCT FROM OLD.stage
    OR NEW.owner_department IS DISTINCT FROM OLD.owner_department
    OR NEW.current_owner_id IS DISTINCT FROM OLD.current_owner_id
    OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
    OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
    OR NEW.first_response_at IS DISTINCT FROM OLD.first_response_at
    OR NEW.intake_completed_at IS DISTINCT FROM OLD.intake_completed_at
    OR NEW.lost_reason IS DISTINCT FROM OLD.lost_reason
    OR NEW.requote_required IS DISTINCT FROM OLD.requote_required
  ) THEN
    RAISE EXCEPTION 'استخدم إجراءات سير العمل المعتمدة لتغيير مرحلة أو مسؤول العميل المحتمل';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sop_lead_workflow_fields_trigger ON public.sop_leads;
CREATE TRIGGER protect_sop_lead_workflow_fields_trigger
BEFORE UPDATE ON public.sop_leads
FOR EACH ROW EXECUTE FUNCTION public.protect_sop_lead_workflow_fields();

CREATE INDEX IF NOT EXISTS customer_follow_ups_org_date_idx
  ON public.customer_follow_ups (organization_id, scheduled_date, status);
CREATE INDEX IF NOT EXISTS customer_communications_org_created_idx
  ON public.customer_communications (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_notes_org_created_idx
  ON public.customer_notes (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_campaigns_org_created_idx
  ON public.marketing_campaigns (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sop_leads_org_stage_updated_idx
  ON public.sop_leads (organization_id, stage, updated_at DESC);
