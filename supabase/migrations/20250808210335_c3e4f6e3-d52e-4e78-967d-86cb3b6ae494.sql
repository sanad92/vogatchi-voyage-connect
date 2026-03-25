-- Set stable search_path for normalize_phone_sql to satisfy linter
CREATE OR REPLACE FUNCTION public.normalize_phone_sql(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  digits text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(p_phone, '[^0-9]+', '', 'g');
  IF digits LIKE '00%' THEN
    digits := substr(digits, 3);
  END IF;
  IF digits LIKE '0%' THEN
    digits := substr(digits, 2);
  END IF;
  RETURN digits;
END;
$$;
