-- Allow shared (org-null) rows to be visible to all org members for lookup/reference tables
-- Fix flight_classes so the 3 seeded rows (Economy/Business/First) appear for all orgs

DROP POLICY IF EXISTS "Org members can manage flight_classes" ON public.flight_classes;
DROP POLICY IF EXISTS "sub_update_flight_classes" ON public.flight_classes;
DROP POLICY IF EXISTS "sub_write_flight_classes" ON public.flight_classes;

CREATE POLICY "Anyone authenticated can read flight_classes"
  ON public.flight_classes FOR SELECT
  TO authenticated
  USING (organization_id IS NULL OR organization_id = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can insert flight_classes"
  ON public.flight_classes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND public.can_org_write(organization_id));

CREATE POLICY "Org members can update flight_classes"
  ON public.flight_classes FOR UPDATE
  TO authenticated
  USING (organization_id IS NOT NULL AND public.can_org_write(organization_id));

CREATE POLICY "Org members can delete flight_classes"
  ON public.flight_classes FOR DELETE
  TO authenticated
  USING (organization_id IS NOT NULL AND public.can_org_write(organization_id));