CREATE SCHEMA IF NOT EXISTS public_intake_private;
REVOKE ALL ON SCHEMA public_intake_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public_intake_private.sites (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  enabled boolean NOT NULL DEFAULT false,
  accepts_booking_requests boolean NOT NULL DEFAULT false,
  request_salt uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public_intake_private.booking_receipts (
  organization_id uuid NOT NULL REFERENCES public_intake_private.sites(organization_id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  lead_id uuid NOT NULL UNIQUE REFERENCES public.sop_leads(id) ON DELETE CASCADE,
  reference text NOT NULL,
  contact_hash bytea NOT NULL,
  payload_hash bytea NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, request_key)
);
CREATE INDEX IF NOT EXISTS public_booking_receipts_time_idx
  ON public_intake_private.booking_receipts (organization_id, received_at DESC);

ALTER TABLE public_intake_private.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_intake_private.booking_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA public_intake_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public_intake_private.can_manage_site(_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND coalesce(public.get_user_org_role(auth.uid(), _org)::text, '') IN ('owner', 'admin')
    AND coalesce(public.has_org_permission(_org, 'admin_settings'), false);
$$;
REVOKE ALL ON FUNCTION public_intake_private.can_manage_site(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_company_public_site_settings(_org uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public_intake_private.can_manage_site(_org) THEN
    RAISE EXCEPTION 'Public site settings are restricted to organization administrators' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT jsonb_build_object('slug', slug, 'enabled', enabled, 'acceptsBooking', accepts_booking_requests)
    FROM public_intake_private.sites
    WHERE organization_id = _org
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_company_public_site_settings(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_public_site_settings(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_company_public_site_settings(_org uuid, _slug text, _enabled boolean, _accepts_booking boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public_intake_private.can_manage_site(_org) OR NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'Public site settings are restricted to organization administrators' USING ERRCODE = '42501';
  END IF;
  IF _slug IS NULL OR _slug !~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
    OR _enabled IS NULL OR _accepts_booking IS NULL THEN
    RAISE EXCEPTION 'Invalid public site settings' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public_intake_private.sites AS site (organization_id, slug, enabled, accepts_booking_requests)
  VALUES (_org, _slug, _enabled, _accepts_booking)
  ON CONFLICT (organization_id) DO UPDATE
    SET enabled = excluded.enabled, accepts_booking_requests = excluded.accepts_booking_requests
    WHERE site.slug = excluded.slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Public site address cannot be changed' USING ERRCODE = '22023';
  END IF;
  RETURN public.get_company_public_site_settings(_org);
END;
$$;
REVOKE ALL ON FUNCTION public.set_company_public_site_settings(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_public_site_settings(uuid, text, boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_booking_site(_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object('name', org.name)
  FROM public_intake_private.sites AS site
  JOIN public.organizations AS org ON org.id = site.organization_id
  WHERE site.slug = _slug AND site.enabled AND site.accepts_booking_requests
    AND coalesce(public.org_has_active_subscription(site.organization_id), false);
$$;
REVOKE ALL ON FUNCTION public.get_public_booking_site(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_booking_site(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_booking_request(_slug text, _request_key uuid, _request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  site public_intake_private.sites;
  prior public_intake_private.booking_receipts;
  request_fields jsonb;
  digest bytea;
  contact_digest bytea;
  customer_name text;
  customer_phone text;
  customer_email text;
  requested_service text;
  destination text;
  departure_date date;
  return_date date;
  adults integer;
  budget text;
  notes text;
  lead_id uuid := gen_random_uuid();
  reference text;
  recent_requests integer;
  recent_contact_requests integer;
BEGIN
  IF _request_key IS NULL OR jsonb_typeof(_request) IS DISTINCT FROM 'object'
    OR octet_length(_request::text) > 10000 THEN
    RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
  END IF;
  IF (_request - ARRAY['customerName', 'customerPhone', 'customerEmail', 'serviceType', 'destination',
      'departureDate', 'returnDate', 'adults', 'budget', 'specialRequests']) <> '{}'::jsonb
    OR EXISTS (
      SELECT FROM jsonb_each(_request) AS field
      WHERE jsonb_typeof(field.value) NOT IN ('string', 'null')
        AND NOT (field.key = 'adults' AND jsonb_typeof(field.value) = 'number')
    ) THEN
    RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
  END IF;

  customer_name := nullif(btrim(_request->>'customerName'), '');
  customer_phone := public.normalize_phone_digits(translate(_request->>'customerPhone', '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'));
  customer_email := nullif(lower(btrim(_request->>'customerEmail')), '');
  requested_service := _request->>'serviceType';
  destination := nullif(btrim(_request->>'destination'), '');
  budget := nullif(btrim(_request->>'budget'), '');
  notes := nullif(btrim(_request->>'specialRequests'), '');

  IF customer_name IS NULL OR length(customer_name) > 120
    OR customer_phone IS NULL OR customer_phone !~ '^[0-9]{7,15}$'
    OR length(_request->>'customerPhone') > 40
    OR _request->>'customerPhone' !~ '^[+0-9٠-٩۰-۹ ().-]+$'
    OR length(customer_email) > 254 OR customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR requested_service IS NULL OR requested_service NOT IN ('hotel', 'flight', 'transport', 'car_rental', 'package', 'other')
    OR length(destination) > 160 OR length(budget) > 120 OR length(notes) > 1500
    OR coalesce(_request->>'adults', '') !~ '^([1-9]|1[0-9]|20)$'
    OR nullif(_request->>'departureDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    OR nullif(_request->>'returnDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Invalid booking request' USING ERRCODE = '22023';
  END IF;

  departure_date := nullif(_request->>'departureDate', '')::date;
  return_date := nullif(_request->>'returnDate', '')::date;
  adults := (_request->>'adults')::integer;
  IF (departure_date IS NOT NULL AND NOT isfinite(departure_date))
    OR (return_date IS NOT NULL AND NOT isfinite(return_date))
    OR return_date < departure_date THEN
    RAISE EXCEPTION 'Return date precedes departure' USING ERRCODE = '22023';
  END IF;

  -- Serialize posting and disablement for the same opt-in site.
  SELECT * INTO site FROM public_intake_private.sites
  WHERE slug = _slug AND enabled AND accepts_booking_requests
  FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(public.org_has_active_subscription(site.organization_id), false) THEN
    RAISE EXCEPTION 'Public booking intake is unavailable' USING ERRCODE = 'PT404';
  END IF;

  request_fields := jsonb_build_array(customer_name, customer_phone, customer_email, requested_service,
    destination, departure_date, return_date, adults, budget, notes);
  digest := sha256(convert_to(site.request_salt::text || request_fields::text, 'UTF8'));
  contact_digest := sha256(convert_to(site.request_salt::text || customer_phone, 'UTF8'));

  SELECT * INTO prior FROM public_intake_private.booking_receipts
  WHERE organization_id = site.organization_id AND request_key = _request_key;
  IF FOUND THEN
    IF prior.payload_hash IS DISTINCT FROM digest THEN
      RAISE EXCEPTION 'Booking request key was already used' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('reference', prior.reference);
  END IF;

  SELECT count(*), count(*) FILTER (WHERE contact_hash = contact_digest)
    INTO recent_requests, recent_contact_requests
  FROM public_intake_private.booking_receipts
  WHERE organization_id = site.organization_id AND received_at > now() - interval '1 hour';
  IF recent_requests >= 60 OR recent_contact_requests >= 3 THEN
    RAISE EXCEPTION 'Try again later' USING ERRCODE = 'PT429';
  END IF;

  reference := 'LD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(lead_id::text, '-', ''), 1, 12));
  INSERT INTO public.sop_leads (id, organization_id, lead_number, contact_name, contact_phone, contact_email,
    destination, check_in, check_out, adults, service_type, special_requests, lead_source)
  VALUES (lead_id, site.organization_id, reference, customer_name, customer_phone, customer_email,
    destination, departure_date, return_date, adults, requested_service,
    nullif(concat_ws(E'\n', CASE WHEN budget IS NOT NULL THEN 'الميزانية المتوقعة: ' || budget END, notes), ''), 'website');
  INSERT INTO public_intake_private.booking_receipts (organization_id, request_key, lead_id, reference, contact_hash, payload_hash)
  VALUES (site.organization_id, _request_key, lead_id, reference, contact_digest, digest);

  RETURN jsonb_build_object('reference', reference);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_public_booking_request(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_booking_request(text, uuid, jsonb) TO anon;
