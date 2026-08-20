-- supplier_payments: consolidate duplicate permissive/restrictive rules into one clear set
DROP POLICY IF EXISTS "supplier_payments_write_requires_subscription" ON public.supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_update_requires_subscription" ON public.supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_delete_requires_subscription" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org insert supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org update supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org delete supplier_payments" ON public.supplier_payments;

CREATE POLICY "supplier_payments_insert" ON public.supplier_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.can_org_write(organization_id)
  );

CREATE POLICY "supplier_payments_update" ON public.supplier_payments
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.can_org_write(organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.can_org_write(organization_id)
  );

CREATE POLICY "supplier_payments_delete" ON public.supplier_payments
  FOR DELETE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.can_org_write(organization_id)
  );

-- supplier_ratings: require active subscription for writes
DROP POLICY IF EXISTS "supplier_ratings_write_requires_subscription" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_update_requires_subscription" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_delete_requires_subscription" ON public.supplier_ratings;

CREATE POLICY "supplier_ratings_write_requires_subscription" ON public.supplier_ratings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));

CREATE POLICY "supplier_ratings_update_requires_subscription" ON public.supplier_ratings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id))
  WITH CHECK (public.can_org_write(organization_id));

CREATE POLICY "supplier_ratings_delete_requires_subscription" ON public.supplier_ratings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));