CREATE INDEX IF NOT EXISTS documents_storage_file_path_idx ON public.documents (file_path);
CREATE INDEX IF NOT EXISTS generated_documents_storage_file_path_idx ON public.generated_documents (file_path);
CREATE INDEX IF NOT EXISTS email_attachments_storage_path_idx ON public.email_attachments (storage_path);

-- Check all document records for the same object, including records hidden by RLS.
-- Otherwise, a second non-confidential or generated record could expose that object.
CREATE OR REPLACE FUNCTION private.has_hidden_confidential_document(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS doc
    WHERE doc.file_path = object_path
      AND doc.organization_id::text = pg_catalog.split_part(object_path, '/', 1)
      AND doc.is_confidential IS TRUE
      AND doc.uploaded_by IS DISTINCT FROM (SELECT auth.uid())
      AND NOT COALESCE(public.get_user_org_role((SELECT auth.uid()), doc.organization_id)
        IN ('owner'::public.org_role, 'admin'::public.org_role, 'manager'::public.org_role), false)
      AND NOT public.is_platform_admin((SELECT auth.uid()))
  );
$$;
REVOKE ALL ON FUNCTION private.has_hidden_confidential_document(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_hidden_confidential_document(text) TO authenticated;

DROP POLICY IF EXISTS "Org members can view their org documents" ON storage.objects;
DROP POLICY IF EXISTS "Read documents with visible metadata" ON storage.objects;
CREATE POLICY "Read documents with visible metadata" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND pg_catalog.split_part(name, '/', 1) = ANY ((SELECT public.get_user_org_ids(auth.uid()))::text[])
  AND NOT private.has_hidden_confidential_document(name)
  AND (
    EXISTS (
      SELECT 1 FROM public.documents AS doc
      WHERE doc.file_path = storage.objects.name
        AND doc.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
    )
    OR EXISTS (
      SELECT 1 FROM public.generated_documents AS doc
      WHERE doc.file_path = storage.objects.name
        AND doc.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
    )
    OR (
      -- Older open sessions register the object before its metadata. Storage
      -- sets owner_id from the session JWT. Only that uploader can receive
      -- the new object during this window, including an INSERT RETURNING.
      owner_id = (SELECT auth.uid())::text
      AND created_at > pg_catalog.now() - interval '10 minutes'
      AND pg_catalog.split_part(name, '/', 2) IN ('uploads', 'invoice', 'receipt', 'voucher')
    )
  )
);

DROP POLICY IF EXISTS "org members read email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Read email attachments with visible metadata" ON storage.objects;
CREATE POLICY "Read email attachments with visible metadata" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND EXISTS (
    SELECT 1 FROM public.email_attachments AS attachment
    WHERE attachment.storage_path = storage.objects.name
      AND attachment.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
  )
);
