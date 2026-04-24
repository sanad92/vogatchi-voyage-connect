-- Add missing columns to hotel_bookings for richer booking data
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS number_of_rooms integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_view text,
  ADD COLUMN IF NOT EXISTS additional_costs_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_source text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0;

-- Index for hotel_id joins
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_id ON public.hotel_bookings(hotel_id);

-- Storage bucket for hotel booking attachments (vouchers, customer cards, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-booking-attachments', 'hotel-booking-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only org members can read/write their org's attachments
-- Path pattern: {organization_id}/{booking_id}/{filename}
CREATE POLICY "Org members read hotel booking attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Org members upload hotel booking attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Org members update hotel booking attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Org members delete hotel booking attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hotel-booking-attachments'
  AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
);