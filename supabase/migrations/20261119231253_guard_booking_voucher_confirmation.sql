-- Voucher confirmations are only valid while their booking remains eligible.
CREATE OR REPLACE FUNCTION private.require_confirmed_voucher_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Take the booking lock so a cancellation cannot commit concurrently with issuance.
  PERFORM 1 FROM public.bookings AS b
    WHERE b.id = NEW.booking_id AND b.organization_id = NEW.organization_id
      AND b.status IN ('confirmed', 'completed', 'paid')
      AND b.workflow_stage <> 'cancelled'
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A voucher requires an eligible confirmed booking';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_confirmed_voucher_booking() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER require_confirmed_booking_for_voucher
  BEFORE INSERT OR UPDATE ON public.booking_vouchers
  FOR EACH ROW EXECUTE FUNCTION private.require_confirmed_voucher_booking();

CREATE TRIGGER require_confirmed_booking_for_voucher_document
  BEFORE INSERT OR UPDATE ON public.generated_documents
  FOR EACH ROW WHEN (NEW.document_type = 'voucher')
  EXECUTE FUNCTION private.require_confirmed_voucher_booking();

CREATE POLICY "Require document permission to insert booking vouchers"
  ON public.booking_vouchers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_org_permission(organization_id, 'bookings_view')
    AND public.has_org_permission(organization_id, 'documents_create'));

CREATE POLICY "Require document permission to update booking vouchers"
  ON public.booking_vouchers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_org_permission(organization_id, 'bookings_view')
    AND public.has_org_permission(organization_id, 'documents_create'))
  WITH CHECK (public.has_org_permission(organization_id, 'bookings_view')
    AND public.has_org_permission(organization_id, 'documents_create'));

CREATE POLICY "Require document permission to insert voucher PDFs"
  ON public.generated_documents AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (document_type <> 'voucher' OR
    (public.can_org_write(organization_id)
      AND public.has_org_permission(organization_id, 'bookings_view')
      AND public.has_org_permission(organization_id, 'documents_create')));

CREATE POLICY "Require document permission to update voucher PDFs"
  ON public.generated_documents AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (document_type <> 'voucher' OR
    (public.can_org_write(organization_id)
      AND public.has_org_permission(organization_id, 'bookings_view')
      AND public.has_org_permission(organization_id, 'documents_create')))
  WITH CHECK (document_type <> 'voucher' OR
    (public.can_org_write(organization_id)
      AND public.has_org_permission(organization_id, 'bookings_view')
      AND public.has_org_permission(organization_id, 'documents_create')));

-- Preserve archived metadata while preventing another download or overwrite of
-- a stored confirmation after cancellation.
CREATE OR REPLACE FUNCTION private.is_current_voucher_pdf(object_path text, writing boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.generated_documents AS doc
    JOIN public.bookings AS b ON b.id = doc.booking_id AND b.organization_id = doc.organization_id
    WHERE doc.file_path = object_path
      AND doc.document_type = 'voucher'
      AND doc.organization_id::text = pg_catalog.split_part(object_path, '/', 1)
      AND public.has_org_permission(doc.organization_id, 'bookings_view')
      AND (NOT writing OR (
        public.can_org_write(doc.organization_id)
        AND public.has_org_permission(doc.organization_id, 'documents_create')
      ))
      AND b.status IN ('confirmed', 'completed', 'paid')
      AND b.workflow_stage <> 'cancelled'
  );
$$;

REVOKE ALL ON FUNCTION private.is_current_voucher_pdf(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_current_voucher_pdf(text, boolean) TO authenticated;

CREATE POLICY "Require eligible booking to read voucher PDF"
  ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (bucket_id <> 'documents' OR pg_catalog.split_part(name, '/', 2) <> 'voucher'
    OR private.is_current_voucher_pdf(name, false));

CREATE POLICY "Require eligible booking to insert voucher PDF"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'documents' OR pg_catalog.split_part(name, '/', 2) <> 'voucher'
    OR private.is_current_voucher_pdf(name, true));

CREATE POLICY "Require eligible booking to update voucher PDF"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  WITH CHECK (bucket_id <> 'documents' OR pg_catalog.split_part(name, '/', 2) <> 'voucher'
    OR private.is_current_voucher_pdf(name, true));
