ALTER TABLE public.rent_contracts
  ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS start_date date;

UPDATE public.rent_contracts SET start_date = contract_start_date WHERE start_date IS NULL AND contract_start_date IS NOT NULL;