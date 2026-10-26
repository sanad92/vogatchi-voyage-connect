DROP POLICY IF EXISTS "Authenticated users can read booking_statuses" ON public.booking_statuses;
CREATE POLICY "Members read active booking_statuses" ON public.booking_statuses
FOR SELECT TO authenticated
USING (
  (is_active = true AND cardinality(public.get_user_org_ids(auth.uid())) > 0)
  OR public.is_platform_admin(auth.uid())
);