
-- 1) hotels: tighten "global" read policy
DROP POLICY IF EXISTS "Global hotels viewable by all org members" ON public.hotels;
CREATE POLICY "Global hotels viewable by all org members"
ON public.hotels
FOR SELECT
USING (
  is_global = true
  AND organization_id IS NULL
  AND COALESCE(is_active, true) = true
  AND user_has_any_org()
);

-- 2) invitations: restrict email-based read to live pending invites
DROP POLICY IF EXISTS "Users can read their own invitations" ON public.invitations;
CREATE POLICY "Users can read their own invitations"
ON public.invitations
FOR SELECT
USING (
  email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text
  AND accepted_at IS NULL
  AND status = 'pending'
  AND expires_at > now()
);

-- 3) supplier_ratings: add organization_id, enforce supplier_id, replace policies
ALTER TABLE public.supplier_ratings
  ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.supplier_ratings sr
SET organization_id = s.organization_id
FROM public.suppliers s
WHERE sr.supplier_id = s.id
  AND sr.organization_id IS NULL;

DELETE FROM public.supplier_ratings WHERE organization_id IS NULL OR supplier_id IS NULL;

ALTER TABLE public.supplier_ratings
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN supplier_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_org ON public.supplier_ratings(organization_id);

DROP POLICY IF EXISTS "Org select supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org insert supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org update supplier_ratings" ON public.supplier_ratings;
DROP POLICY IF EXISTS "Org delete supplier_ratings" ON public.supplier_ratings;

CREATE POLICY "Org select supplier_ratings"
ON public.supplier_ratings FOR SELECT
USING (organization_id = ANY (get_user_org_ids(auth.uid())) AND supplier_org_match(supplier_id));

CREATE POLICY "Org insert supplier_ratings"
ON public.supplier_ratings FOR INSERT
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())) AND supplier_org_match(supplier_id));

CREATE POLICY "Org update supplier_ratings"
ON public.supplier_ratings FOR UPDATE
USING (organization_id = ANY (get_user_org_ids(auth.uid())) AND supplier_org_match(supplier_id))
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())) AND supplier_org_match(supplier_id));

CREATE POLICY "Org delete supplier_ratings"
ON public.supplier_ratings FOR DELETE
USING (organization_id = ANY (get_user_org_ids(auth.uid())) AND supplier_org_match(supplier_id));
