
-- Fix transport_bookings RLS: replace permissive policy with org-based filtering
DROP POLICY IF EXISTS "Authenticated users can manage transport_bookings" ON public.transport_bookings;

CREATE POLICY "Org members can manage transport_bookings"
ON public.transport_bookings
FOR ALL
USING (organization_id = ANY (get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));
