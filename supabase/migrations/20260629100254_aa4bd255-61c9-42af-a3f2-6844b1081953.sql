ALTER TABLE public.rent_contracts
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS annual_increase_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_period_months integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS landlord_phone text,
  ADD COLUMN IF NOT EXISTS contract_terms text,
  ADD COLUMN IF NOT EXISTS security_deposit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilities_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_responsibility text DEFAULT 'landlord';

UPDATE public.rent_contracts
SET
  contract_start_date = COALESCE(contract_start_date, start_date),
  contract_end_date = COALESCE(contract_end_date, end_date),
  start_date = COALESCE(start_date, contract_start_date),
  end_date = COALESCE(end_date, contract_end_date),
  property_name = COALESCE(NULLIF(btrim(property_name), ''), NULLIF(btrim(property_address), ''), contract_number, 'عقار بدون اسم'),
  currency = COALESCE(NULLIF(currency, ''), 'EGP'),
  property_type = COALESCE(NULLIF(property_type, ''), 'office'),
  annual_increase_percentage = COALESCE(annual_increase_percentage, 0),
  renewal_period_months = COALESCE(renewal_period_months, 12),
  security_deposit = COALESCE(security_deposit, 0),
  utilities_included = COALESCE(utilities_included, false),
  maintenance_responsibility = COALESCE(NULLIF(maintenance_responsibility, ''), 'landlord')
WHERE
  contract_start_date IS NULL OR contract_end_date IS NULL OR start_date IS NULL OR end_date IS NULL
  OR property_name IS NULL OR btrim(property_name) = '' OR currency IS NULL OR currency = ''
  OR property_type IS NULL OR property_type = '' OR annual_increase_percentage IS NULL
  OR renewal_period_months IS NULL OR security_deposit IS NULL OR utilities_included IS NULL
  OR maintenance_responsibility IS NULL OR maintenance_responsibility = '';

CREATE OR REPLACE FUNCTION public.normalize_rent_contract_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.contract_start_date := COALESCE(NEW.contract_start_date, NEW.start_date);
  NEW.contract_end_date := COALESCE(NEW.contract_end_date, NEW.end_date);
  NEW.start_date := COALESCE(NEW.start_date, NEW.contract_start_date);
  NEW.end_date := COALESCE(NEW.end_date, NEW.contract_end_date);

  IF NEW.property_name IS NULL OR btrim(NEW.property_name) = '' THEN
    NEW.property_name := COALESCE(NULLIF(btrim(NEW.property_address), ''), NEW.contract_number, 'عقار بدون اسم');
  END IF;

  NEW.currency := COALESCE(NULLIF(NEW.currency, ''), 'EGP');
  NEW.property_type := COALESCE(NULLIF(NEW.property_type, ''), 'office');
  NEW.annual_increase_percentage := COALESCE(NEW.annual_increase_percentage, 0);
  NEW.renewal_period_months := COALESCE(NEW.renewal_period_months, NEW.contract_duration_months, 12);
  NEW.contract_duration_months := COALESCE(NEW.contract_duration_months, NEW.renewal_period_months, 12);
  NEW.security_deposit := COALESCE(NEW.security_deposit, 0);
  NEW.utilities_included := COALESCE(NEW.utilities_included, false);
  NEW.maintenance_responsibility := COALESCE(NULLIF(NEW.maintenance_responsibility, ''), 'landlord');
  NEW.is_active := COALESCE(NEW.is_active, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_rent_contract_payload ON public.rent_contracts;
CREATE TRIGGER trg_normalize_rent_contract_payload
BEFORE INSERT OR UPDATE ON public.rent_contracts
FOR EACH ROW
EXECUTE FUNCTION public.normalize_rent_contract_payload();

NOTIFY pgrst, 'reload schema';