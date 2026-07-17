
-- 1. search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. Revoke execute from anon/public on SECURITY DEFINER trigger-only functions
REVOKE EXECUTE ON FUNCTION public.wa_template_track_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_template_track_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.booking_tasks_emit_timeline() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_emit_stage_timeline() FROM PUBLIC, anon, authenticated;

-- 3. Consolidate is_platform_admin_v2 to delegate to is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin_v2(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.is_platform_admin(_user_id); $$;

-- 4. hotels: restrict global policies to authenticated role
DROP POLICY IF EXISTS "Global hotels viewable by all org members" ON public.hotels;
DROP POLICY IF EXISTS "Only platform admins can write global hotels" ON public.hotels;

CREATE POLICY "Global hotels viewable by all org members"
ON public.hotels
FOR SELECT
TO authenticated
USING (is_global = true AND organization_id IS NULL AND COALESCE(is_active, true) = true AND user_has_any_org());

CREATE POLICY "Only platform admins can write global hotels"
ON public.hotels
FOR ALL
TO authenticated
USING (is_global = true AND is_platform_admin(auth.uid()))
WITH CHECK (is_global = true AND is_platform_admin(auth.uid()));

-- 5. system_settings: restrict public-read to whitelisted safe keys
DROP POLICY IF EXISTS "Read public settings" ON public.system_settings;
CREATE POLICY "Read public settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  is_public = true
  AND setting_key IN ('site_name','site_description','company_name','company_phone','company_email','company_address')
);

-- 6. Reference tables: require the reader to belong to an organization
DROP POLICY IF EXISTS "Read vehicle_types" ON public.vehicle_types;
CREATE POLICY "Read vehicle_types"
ON public.vehicle_types
FOR SELECT
TO authenticated
USING (user_has_any_org());

DROP POLICY IF EXISTS "Read transport_routes" ON public.transport_routes;
CREATE POLICY "Read transport_routes"
ON public.transport_routes
FOR SELECT
TO authenticated
USING (user_has_any_org());

DROP POLICY IF EXISTS "Read special_request_types" ON public.special_request_types;
CREATE POLICY "Read special_request_types"
ON public.special_request_types
FOR SELECT
TO authenticated
USING (user_has_any_org());
