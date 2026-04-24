-- 1. Add new columns to airports
ALTER TABLE public.airports
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icao_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- 2. Add new columns to airlines  
ALTER TABLE public.airlines
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS icao_code text;

-- 3. Indexes for fast lookup & search
CREATE INDEX IF NOT EXISTS idx_airports_iata ON public.airports(iata_code) WHERE iata_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_airports_global_active ON public.airports(is_global, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_airports_search ON public.airports USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(iata_code,'')));

CREATE INDEX IF NOT EXISTS idx_airlines_iata ON public.airlines(iata_code) WHERE iata_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_airlines_global_active ON public.airlines(is_global, is_active) WHERE is_active = true;

-- 4. Unique constraint for global IATA codes (prevent duplicates during import)
CREATE UNIQUE INDEX IF NOT EXISTS uq_airports_global_iata 
  ON public.airports(iata_code) 
  WHERE is_global = true AND iata_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_airlines_global_iata 
  ON public.airlines(iata_code) 
  WHERE is_global = true AND iata_code IS NOT NULL;

-- 5. Drop existing policies and recreate with global-data support
DROP POLICY IF EXISTS "Org members can manage airports" ON public.airports;
DROP POLICY IF EXISTS "sub_update_airports" ON public.airports;
DROP POLICY IF EXISTS "sub_write_airports" ON public.airports;

DROP POLICY IF EXISTS "Org members can manage airlines" ON public.airlines;
DROP POLICY IF EXISTS "sub_update_airlines" ON public.airlines;
DROP POLICY IF EXISTS "sub_write_airlines" ON public.airlines;

-- 6. New RLS for airports
-- Anyone authenticated can READ global airports + their org's airports
CREATE POLICY "Read global and org airports"
ON public.airports FOR SELECT
TO authenticated
USING (
  organization_id IS NULL  -- global data
  OR organization_id = ANY(public.get_user_org_ids(auth.uid()))
);

-- Only org members can INSERT for their own org (NOT global)
CREATE POLICY "Org members insert org airports"
ON public.airports FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

-- Only org members can UPDATE their org's airports (NOT global)
CREATE POLICY "Org members update org airports"
ON public.airports FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

-- Only org members can DELETE their org's airports (NOT global)
CREATE POLICY "Org members delete org airports"
ON public.airports FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

-- Platform admins can manage global data
CREATE POLICY "Platform admin manage all airports"
ON public.airports FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- 7. New RLS for airlines (same pattern)
CREATE POLICY "Read global and org airlines"
ON public.airlines FOR SELECT
TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = ANY(public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Org members insert org airlines"
ON public.airlines FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

CREATE POLICY "Org members update org airlines"
ON public.airlines FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

CREATE POLICY "Org members delete org airlines"
ON public.airlines FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND is_global = false
);

CREATE POLICY "Platform admin manage all airlines"
ON public.airlines FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));