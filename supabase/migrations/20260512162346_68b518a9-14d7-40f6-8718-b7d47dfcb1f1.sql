-- 1) media_library: tighten SELECT to uploader only
DROP POLICY IF EXISTS "Users view media" ON public.media_library;

CREATE POLICY "Users view own media"
  ON public.media_library
  FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

-- 2) storage.objects: remove the two overly broad documents policies
DROP POLICY IF EXISTS "Authenticated users can read own org documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own org documents" ON storage.objects;

-- Add proper org-scoped DELETE policy to replace the broad one (org admins only)
-- Note: an "Org admins can delete their org documents" policy already exists and is sufficient.