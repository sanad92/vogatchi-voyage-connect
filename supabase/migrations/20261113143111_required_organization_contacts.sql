BEGIN;

-- Match the business-email policy in the tenant authorization migration.
CREATE OR REPLACE FUNCTION public.is_free_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(ARRAY['gmail.com','googlemail.com','yahoo.com','ymail.com','rocketmail.com','outlook.com','hotmail.com','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','mail.com','proton.me','protonmail.com','gmx.com','zoho.com','yandex.com']) d
    WHERE split_part(lower(btrim(coalesce(_email,''))), '@', 2) = d
       OR split_part(lower(btrim(coalesce(_email,''))), '@', 2) LIKE '%.' || d
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_free_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_free_email(text) TO authenticated, service_role;

CREATE SCHEMA organization_contact_private;
REVOKE ALL ON SCHEMA organization_contact_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA organization_contact_private TO authenticated;

ALTER FUNCTION public.create_organization_onboarding(text, text, text, text, text)
  SET SCHEMA organization_contact_private;
REVOKE EXECUTE ON FUNCTION organization_contact_private.create_organization_onboarding(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION organization_contact_private.normalize_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE WHEN digits ~ '^\+?[0-9]{7,15}$' THEN digits END
  FROM (
    SELECT regexp_replace(translate(p_phone, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[[:space:]().-]', '', 'g') AS digits
  ) normalized
  WHERE char_length(p_phone) <= 32;
$$;

CREATE FUNCTION organization_contact_private.save_contacts(
  p_name text, p_owner_phone text, p_company_phone text, p_company_email text,
  p_organization_id uuid, p_create boolean, p_company_name text, p_slug text, p_address text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_email text;
  v_email_confirmed_at timestamptz;
  v_owner_name text := btrim(coalesce(p_name, ''));
  v_owner_phone text := organization_contact_private.normalize_phone(p_owner_phone);
  v_company_phone text := organization_contact_private.normalize_phone(p_company_phone);
  v_company_email text := lower(btrim(coalesce(p_company_email, '')));
  v_organization_id uuid := p_organization_id;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً' USING ERRCODE = '42501';
  END IF;

  -- Serialize creation and contact updates for the same account.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 843625));
  SELECT u.email, u.email_confirmed_at INTO v_account_email, v_email_confirmed_at
  FROM auth.users u WHERE u.id = v_user_id;

  IF p_create AND (v_email_confirmed_at IS NULL OR v_account_email IS NULL OR public.is_free_email(v_account_email)) THEN
    RAISE EXCEPTION 'يجب تأكيد بريد العمل الرسمي قبل إنشاء المؤسسة أو قبول الدعوة' USING ERRCODE = '42501';
  END IF;

  IF p_create IS NOT TRUE AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = p_organization_id AND m.user_id = v_user_id AND m.role = 'owner' AND m.is_active AND o.is_active
  ) THEN
    RAISE EXCEPTION 'Only an active organization owner can complete these details' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_owner_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'أدخل اسم المسؤول من حرفين إلى 120 حرفًا.' USING ERRCODE = '22023';
  END IF;
  IF v_owner_phone IS NULL THEN
    RAISE EXCEPTION 'أدخل رقم هاتف صحيح لمسؤول المؤسسة.' USING ERRCODE = '22023';
  END IF;
  IF v_company_phone IS NULL THEN
    RAISE EXCEPTION 'أدخل رقم هاتف صحيح للمؤسسة.' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_company_email) > 255 OR v_company_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$' THEN
    RAISE EXCEPTION 'أدخل بريدًا إلكترونيًا صحيحًا للمؤسسة.' USING ERRCODE = '22023';
  END IF;

  IF p_create THEN
    IF public.is_free_email(v_company_email) THEN
      RAISE EXCEPTION 'التسجيل مخصص للشركات فقط. يرجى استخدام بريد العمل الرسمي.' USING ERRCODE = '22023';
    END IF;
    IF char_length(btrim(p_address)) > 500 THEN
      RAISE EXCEPTION 'عنوان المؤسسة طويل جدًا.' USING ERRCODE = '22023';
    END IF;
    v_organization_id := organization_contact_private.create_organization_onboarding(
      p_company_name, p_slug, v_company_phone, v_company_email, p_address
    );
  ELSE
    INSERT INTO public.organization_settings (organization_id, phone, email)
    VALUES (p_organization_id, v_company_phone, v_company_email)
    ON CONFLICT (organization_id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (v_user_id, v_owner_name, v_owner_phone, v_account_email)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
    email = coalesce(EXCLUDED.email, profiles.email), updated_at = now();

  RETURN v_organization_id;
END;
$$;

CREATE FUNCTION public.create_organization_onboarding(
  _name text, _owner_name text, _owner_phone text, _phone text, _email text,
  _slug text DEFAULT NULL, _address text DEFAULT NULL
)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$
  SELECT organization_contact_private.save_contacts(_owner_name, _owner_phone, _phone, _email, NULL, true, _name, _slug, _address)
$$;

CREATE FUNCTION public.complete_organization_contacts(
  _organization_id uuid, _owner_name text, _owner_phone text, _phone text, _email text
)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$
  SELECT organization_contact_private.save_contacts(_owner_name, _owner_phone, _phone, _email, _organization_id, false, NULL, NULL, NULL)
$$;

REVOKE ALL ON FUNCTION organization_contact_private.normalize_phone(text),
  organization_contact_private.save_contacts(text,text,text,text,uuid,boolean,text,text,text),
  public.create_organization_onboarding(text,text,text,text,text,text,text),
  public.complete_organization_contacts(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION organization_contact_private.save_contacts(text,text,text,text,uuid,boolean,text,text,text),
  public.create_organization_onboarding(text,text,text,text,text,text,text),
  public.complete_organization_contacts(uuid,text,text,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
