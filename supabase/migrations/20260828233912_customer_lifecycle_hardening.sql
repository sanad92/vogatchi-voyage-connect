-- Customer lifecycle hardening: reversible archiving, canonical e-mail checks,
-- and a single organization-scoped duplicate-contact lookup for the UI.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customers_org_archive_created_idx
  ON public.customers (organization_id, archived_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.stamp_customer_archive_actor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.archived_at IS NOT NULL AND current_user = 'authenticated' THEN
      RAISE EXCEPTION 'لا يمكن إنشاء عميل مؤرشف مباشرة';
    END IF;
    IF NEW.archived_at IS NULL THEN
      NEW.archived_by := NULL;
    ELSE
      NEW.archived_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    -- Authenticated clients must use the permission-checked RPC below.
    IF current_user = 'authenticated' THEN
      RAISE EXCEPTION 'استخدم إجراء أرشفة العميل المعتمد';
    END IF;
    NEW.archived_by := CASE WHEN NEW.archived_at IS NULL THEN NULL ELSE auth.uid() END;
  ELSE
    -- The audit actor cannot be forged independently from the archive action.
    NEW.archived_by := OLD.archived_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_customer_archive_actor_trigger ON public.customers;
CREATE TRIGGER stamp_customer_archive_actor_trigger
BEFORE INSERT OR UPDATE OF archived_at, archived_by ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.stamp_customer_archive_actor();

REVOKE ALL ON FUNCTION public.stamp_customer_archive_actor() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_customer_archived(
  _org_id uuid,
  _customer_id uuid,
  _archived boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_row public.customers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;
  IF NOT public.can_org_write(_org_id)
     OR NOT public.has_org_permission(_org_id, 'customers_delete') THEN
    RAISE EXCEPTION 'غير مصرح لك بأرشفة العملاء';
  END IF;

  SELECT * INTO customer_row
  FROM public.customers
  WHERE id = _customer_id AND organization_id = _org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'العميل غير موجود داخل المؤسسة';
  END IF;

  UPDATE public.customers
  SET archived_at = CASE WHEN _archived THEN COALESCE(archived_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = customer_row.id
  RETURNING * INTO customer_row;

  RETURN jsonb_build_object(
    'id', customer_row.id,
    'archived_at', customer_row.archived_at,
    'archived_by', customer_row.archived_by
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_customer_archived(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_archived(uuid, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.normalize_email_address(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(NULLIF(btrim(_email), ''));
$$;

REVOKE ALL ON FUNCTION public.normalize_email_address(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.canonicalize_and_prevent_duplicate_customer_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := public.normalize_email_address(NEW.email);
  NEW.email := normalized;

  IF TG_OP = 'UPDATE'
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN
    RETURN NEW;
  END IF;
  IF normalized IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.organization_id::text || ':email:' || normalized, 0)
  );
  IF EXISTS (
    SELECT 1
    FROM public.customers AS customer
    WHERE customer.organization_id = NEW.organization_id
      AND customer.id <> NEW.id
      AND public.normalize_email_address(customer.email) = normalized
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'البريد الإلكتروني مسجل بالفعل لعميل آخر داخل المؤسسة';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_customer_email_trigger ON public.customers;
CREATE TRIGGER prevent_duplicate_customer_email_trigger
BEFORE INSERT OR UPDATE OF email, organization_id ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.canonicalize_and_prevent_duplicate_customer_email();

REVOKE ALL ON FUNCTION public.canonicalize_and_prevent_duplicate_customer_email() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_customer_duplicate_contact(
  _org_id uuid,
  _phone text,
  _email text DEFAULT NULL,
  _exclude_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text := public.normalize_phone_digits(_phone);
  normalized_email text := public.normalize_email_address(_email);
  phone_matches jsonb := '[]'::jsonb;
  email_matches jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_org_permission(_org_id, 'customers_view') THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض عملاء هذه المؤسسة';
  END IF;

  IF normalized_phone IS NOT NULL AND length(normalized_phone) >= 6 THEN
    SELECT COALESCE(jsonb_agg(match ORDER BY (match->>'archived_at') IS NOT NULL, match->>'created_at'), '[]'::jsonb)
    INTO phone_matches
    FROM (
      SELECT jsonb_build_object(
        'id', customer.id,
        'name', customer.name,
        'phone', customer.phone,
        'email', customer.email,
        'archived_at', customer.archived_at,
        'created_at', customer.created_at
      ) AS match
      FROM public.customers AS customer
      WHERE customer.organization_id = _org_id
        AND customer.id IS DISTINCT FROM _exclude_id
        AND public.normalize_phone_digits(customer.phone) = normalized_phone
      LIMIT 10
    ) AS phone_rows;
  END IF;

  IF normalized_email IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(match ORDER BY (match->>'archived_at') IS NOT NULL, match->>'created_at'), '[]'::jsonb)
    INTO email_matches
    FROM (
      SELECT jsonb_build_object(
        'id', customer.id,
        'name', customer.name,
        'phone', customer.phone,
        'email', customer.email,
        'archived_at', customer.archived_at,
        'created_at', customer.created_at
      ) AS match
      FROM public.customers AS customer
      WHERE customer.organization_id = _org_id
        AND customer.id IS DISTINCT FROM _exclude_id
        AND public.normalize_email_address(customer.email) = normalized_email
      LIMIT 10
    ) AS email_rows;
  END IF;

  RETURN jsonb_build_object(
    'hasDuplication', jsonb_array_length(phone_matches) > 0 OR jsonb_array_length(email_matches) > 0,
    'normalizedPhone', normalized_phone,
    'phoneResult', jsonb_build_object(
      'isDuplicate', jsonb_array_length(phone_matches) > 0,
      'existingCustomer', phone_matches->0,
      'duplicateCount', jsonb_array_length(phone_matches),
      'allDuplicates', phone_matches,
      'message', CASE WHEN jsonb_array_length(phone_matches) > 0
        THEN 'رقم الهاتف مسجل بالفعل للعميل: ' || COALESCE(phone_matches->0->>'name', 'غير معروف')
        ELSE NULL END
    ),
    'emailResult', jsonb_build_object(
      'isDuplicate', jsonb_array_length(email_matches) > 0,
      'existingCustomer', email_matches->0,
      'message', CASE WHEN jsonb_array_length(email_matches) > 0
        THEN 'البريد الإلكتروني مسجل بالفعل للعميل: ' || COALESCE(email_matches->0->>'name', 'غير معروف')
        ELSE NULL END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_customer_duplicate_contact(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_customer_duplicate_contact(uuid, text, text, uuid) TO authenticated;

ALTER TABLE public.customers VALIDATE CONSTRAINT customers_name_nonblank;
ALTER TABLE public.customers VALIDATE CONSTRAINT customers_loyalty_nonnegative;

-- RLS protects row access; these table capabilities are not needed by the app.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.customers FROM authenticated, anon;
