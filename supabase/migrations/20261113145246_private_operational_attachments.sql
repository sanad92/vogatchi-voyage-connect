INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pilgrimage-attachments', 'pilgrimage-attachments', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('support-attachments', 'support-attachments', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

CREATE POLICY "Managers read pilgrimage attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pilgrimage-attachments'
  AND EXISTS (
    SELECT 1 FROM public.pilgrims p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND p.organization_id::text = (storage.foldername(name))[1]
      AND coalesce(public.get_user_org_role(auth.uid(), p.organization_id)::text, '') IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Managers upload pilgrimage attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pilgrimage-attachments'
  AND EXISTS (
    SELECT 1 FROM public.pilgrims p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND p.organization_id::text = (storage.foldername(name))[1]
      AND p.status <> 'cancelled'
      AND public.can_org_write(p.organization_id)
      AND coalesce(public.get_user_org_role(auth.uid(), p.organization_id)::text, '') IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Ticket participants read support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id::text = (storage.foldername(name))[2]
      AND t.organization_id::text = (storage.foldername(name))[1]
      AND (
        public.is_platform_admin(auth.uid())
        OR public.user_belongs_to_org(auth.uid(), t.organization_id)
      )
  )
);

CREATE POLICY "Ticket participants upload support attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id::text = (storage.foldername(name))[2]
      AND t.organization_id::text = (storage.foldername(name))[1]
      AND t.status <> 'closed'
      AND (
        public.is_platform_admin(auth.uid())
        OR public.user_belongs_to_org(auth.uid(), t.organization_id)
      )
  )
);
