
-- payment_transactions: tighten to authenticated
DROP POLICY IF EXISTS "Org members can view payment transactions" ON public.payment_transactions;
CREATE POLICY "Org members can view payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (organization_id = ANY (public.get_user_org_ids(auth.uid())));

-- supplier_ratings: tighten all policies to authenticated
DROP POLICY IF EXISTS "Org select supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org insert supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org update supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org delete supplier_ratings" ON public.supplier_ratings;

CREATE POLICY "Org select supplier_ratings"
ON public.supplier_ratings
FOR SELECT
TO authenticated
USING (organization_id = ANY (public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org insert supplier_ratings"
ON public.supplier_ratings
FOR INSERT
TO authenticated
WITH CHECK (organization_id = ANY (public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org update supplier_ratings"
ON public.supplier_ratings
FOR UPDATE
TO authenticated
USING (organization_id = ANY (public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org delete supplier_ratings"
ON public.supplier_ratings
FOR DELETE
TO authenticated
USING (organization_id = ANY (public.get_user_org_ids(auth.uid())));

-- supplier_payments: enforce non-null org matching caller's org on insert
DROP POLICY IF EXISTS "Org insert supplier_payments" ON public.supplier_payments;
CREATE POLICY "Org insert supplier_payments"
ON public.supplier_payments
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
);

-- subscription_plans: keep public pricing but scope explicitly and to active plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);
