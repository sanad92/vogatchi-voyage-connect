CREATE OR REPLACE FUNCTION public.sop_intake_missing(l sop_leads)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE m text[] := ARRAY[]::text[];
BEGIN
  IF coalesce(l.contact_name,'') = '' THEN m := m || 'contact_name'::text; END IF;
  IF coalesce(l.contact_phone,'') = '' AND coalesce(l.contact_email,'') = '' THEN m := m || 'contact_phone_or_email'::text; END IF;
  IF coalesce(l.destination,'') = '' AND coalesce(l.city,'') = '' THEN m := m || 'destination_or_city'::text; END IF;
  IF l.check_in IS NULL AND coalesce(l.approx_dates,'') = '' THEN m := m || 'dates_or_approx_dates'::text; END IF;
  IF coalesce(l.adults,0) < 1 THEN m := m || 'adults'::text; END IF;
  IF coalesce(l.children_count,0) > 0 AND jsonb_array_length(coalesce(l.children_ages,'[]'::jsonb)) < l.children_count
    THEN m := m || 'children_ages'::text; END IF;
  IF coalesce(l.service_type,'') = 'hotel' AND coalesce(l.rooms,0) < 1 THEN m := m || 'rooms'::text; END IF;
  IF coalesce(l.budget_level,'') = '' AND l.budget_amount IS NULL THEN m := m || 'budget_or_service_level'::text; END IF;
  IF coalesce(l.priorities,'') = '' THEN m := m || 'priorities'::text; END IF;
  IF coalesce(l.lead_source,'') = '' THEN m := m || 'lead_source'::text; END IF;
  RETURN m;
END $function$;

REVOKE EXECUTE ON FUNCTION public.sop_intake_missing(sop_leads) FROM anon, public;