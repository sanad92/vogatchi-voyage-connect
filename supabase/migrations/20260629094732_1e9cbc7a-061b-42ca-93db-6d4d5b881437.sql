ALTER TABLE public.rent_contracts
  ADD COLUMN IF NOT EXISTS annual_increase_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_period_months integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS landlord_phone text,
  ADD COLUMN IF NOT EXISTS contract_terms text,
  ADD COLUMN IF NOT EXISTS security_deposit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilities_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_responsibility text DEFAULT 'landlord';