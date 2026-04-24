DROP POLICY IF EXISTS "Org members update hotel booking attachments" ON storage.objects;

CREATE POLICY "Org members update hotel booking attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
);