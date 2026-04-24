-- Add global hotels columns
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS tbo_hotel_code text;

-- Make organization_id nullable for global hotels
ALTER TABLE public.hotels ALTER COLUMN organization_id DROP NOT NULL;

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_hotels_is_global ON public.hotels(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_hotels_country_code ON public.hotels(country_code) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_hotels_city ON public.hotels(city) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_hotels_org ON public.hotels(organization_id) WHERE is_global = false;

-- Trigram extension for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_hotels_name_trgm ON public.hotels USING gin(name gin_trgm_ops) WHERE is_global = true;

-- Unique TBO code among globals
CREATE UNIQUE INDEX IF NOT EXISTS uq_hotels_tbo_code_global
  ON public.hotels(tbo_hotel_code)
  WHERE is_global = true AND tbo_hotel_code IS NOT NULL;

-- Drop old policies if any conflict, then add new ones
DO $$
BEGIN
  -- Allow all org members to view global hotels
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='hotels' AND policyname='Global hotels viewable by all org members'
  ) THEN
    CREATE POLICY "Global hotels viewable by all org members"
      ON public.hotels FOR SELECT
      USING (is_global = true AND public.user_has_any_org());
  END IF;

  -- Block writes to global hotels (only platform admins)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='hotels' AND policyname='Only platform admins can write global hotels'
  ) THEN
    CREATE POLICY "Only platform admins can write global hotels"
      ON public.hotels FOR ALL
      USING (is_global = true AND public.is_platform_admin(auth.uid()))
      WITH CHECK (is_global = true AND public.is_platform_admin(auth.uid()));
  END IF;
END $$;

-- Storage bucket for hotel CSV imports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-imports', 'hotel-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Only platform admins can upload/read hotel import files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Platform admins can read hotel imports') THEN
    CREATE POLICY "Platform admins can read hotel imports"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Platform admins can upload hotel imports') THEN
    CREATE POLICY "Platform admins can upload hotel imports"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Platform admins can delete hotel imports') THEN
    CREATE POLICY "Platform admins can delete hotel imports"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));
  END IF;
END $$;