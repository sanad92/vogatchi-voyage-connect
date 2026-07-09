-- 1) Extra media columns
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_storage_path text,
  ADD COLUMN IF NOT EXISTS media_file_name text,
  ADD COLUMN IF NOT EXISTS media_caption text,
  ADD COLUMN IF NOT EXISTS media_duration_seconds int;

-- 2) Storage policies for whatsapp-media bucket
-- Files live under: <organization_id>/<conversation_id>/<file>
-- Only members of that organization may read; service_role handles writes from edge functions.

DROP POLICY IF EXISTS "wa_media_read_org_members" ON storage.objects;
CREATE POLICY "wa_media_read_org_members"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "wa_media_insert_org_members" ON storage.objects;
CREATE POLICY "wa_media_insert_org_members"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "wa_media_delete_org_members" ON storage.objects;
CREATE POLICY "wa_media_delete_org_members"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = (storage.foldername(name))[1]
    )
  );