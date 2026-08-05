-- 1. Documents storage: restrict UPDATE to uploader or org owner/admin/manager
DROP POLICY IF EXISTS "Org members can update their org documents" ON storage.objects;

CREATE POLICY "Uploaders or org admins can update org documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_user_org_ids(auth.uid()))
  AND (
    owner = auth.uid()
    OR public.get_user_org_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
       = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role, 'manager'::public.org_role])
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_user_org_ids(auth.uid()))
  AND (
    owner = auth.uid()
    OR public.get_user_org_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
       = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role, 'manager'::public.org_role])
  )
);

-- 2. Invitations: remove email-match read policy (acceptance uses the secure token RPC)
DROP POLICY IF EXISTS "Users can read their own invitations" ON public.invitations;

-- 3. Quick replies: enforce hard organization scope on every operation
DROP POLICY IF EXISTS quick_replies_org_scope ON public.quick_replies;

CREATE POLICY quick_replies_org_scope
ON public.quick_replies
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (organization_id = ANY (public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_org_ids(auth.uid())));