BEGIN;

-- Return the missing fields only. A registered owner, rather than a company
-- switchboard or an employee record, is the source of the account phone.
CREATE FUNCTION platform_company_private.contact_gaps()
RETURNS TABLE (organization_id uuid, fields text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT o.id, gaps.fields
  FROM public.organizations o
  LEFT JOIN public.organization_settings s ON s.organization_id = o.id
  LEFT JOIN LATERAL (
    SELECT p.id,
      char_length(btrim(p.full_name)) BETWEEN 2 AND 120 AS valid_name,
      organization_contact_private.normalize_phone(p.phone) IS NOT NULL AS valid_phone,
      btrim(coalesce(p.email, '')) ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$' AS valid_email
    FROM public.organization_members m
    JOIN public.profiles p ON p.id = m.user_id AND p.is_active
    WHERE m.organization_id = o.id AND m.is_active AND m.role = 'owner'
    ORDER BY (char_length(btrim(p.full_name)) BETWEEN 2 AND 120
      AND organization_contact_private.normalize_phone(p.phone) IS NOT NULL
      AND btrim(coalesce(p.email, '')) ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$') DESC NULLS LAST,
      m.joined_at, m.id
    LIMIT 1
  ) owner_contact ON true
  CROSS JOIN LATERAL (
    SELECT array_remove(ARRAY[
      CASE WHEN organization_contact_private.normalize_phone(coalesce(nullif(btrim(s.phone), ''), o.phone)) IS NULL THEN 'company_phone' END,
      CASE WHEN coalesce(nullif(btrim(s.email), ''), btrim(o.email), '') !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$' THEN 'company_email' END,
      CASE WHEN owner_contact.id IS NULL THEN 'owner' END,
      CASE WHEN owner_contact.id IS NOT NULL AND owner_contact.valid_name IS NOT TRUE THEN 'owner_name' END,
      CASE WHEN owner_contact.id IS NOT NULL AND NOT owner_contact.valid_phone THEN 'owner_phone' END,
      CASE WHEN owner_contact.id IS NOT NULL AND NOT owner_contact.valid_email THEN 'owner_email' END
    ], NULL) AS fields
  ) gaps
  WHERE cardinality(gaps.fields) > 0;
END;
$$;

CREATE FUNCTION public.platform_company_contact_gaps()
RETURNS TABLE (organization_id uuid, fields text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM platform_company_private.contact_gaps() $$;

CREATE FUNCTION platform_company_private.billing_followup()
RETURNS TABLE (kind text, id uuid, organization_id uuid, company_name text, plan_name text, plan_name_ar text,
  event_at timestamptz, status text, amount numeric, currency text, reference text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH current_subscriptions AS (
    SELECT DISTINCT ON (s.organization_id) s.id, s.organization_id, s.plan_id, s.starts_at, s.expires_at, s.status
    FROM public.subscriptions s
    ORDER BY s.organization_id, s.created_at DESC NULLS LAST, s.id DESC
  )
  SELECT 'renewal'::text, s.id, s.organization_id, o.name, p.name, p.name_ar,
    s.expires_at, s.status::text, NULL::numeric, NULL::text, NULL::text
  FROM current_subscriptions s
  JOIN public.organizations o ON o.id = s.organization_id AND o.is_active
  LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.status IN ('active', 'trialing') AND s.starts_at <= now()
    AND s.expires_at > now() AND s.expires_at <= now() + interval '168 hours'
  UNION ALL
  SELECT 'transfer', b.id, b.organization_id, o.name, p.name, p.name_ar,
    b.created_at, b.status::text, b.amount, b.currency, b.transfer_reference
  FROM public.bank_transfer_requests b
  JOIN public.organizations o ON o.id = b.organization_id
  LEFT JOIN public.subscription_plans p ON p.id = b.plan_id
  WHERE b.status = 'pending'
  UNION ALL
  SELECT 'activation', t.id, t.organization_id, o.name, p.name, p.name_ar,
    coalesce(t.processed_at, t.created_at), t.status::text, t.amount_cents / 100.0, t.currency, t.paymob_transaction_id
  FROM public.payment_transactions t
  JOIN public.payment_checkout_sessions c ON c.id = t.checkout_session_id
    AND c.organization_id = t.organization_id AND c.plan_id = t.plan_id AND c.billing_cycle = t.billing_cycle
    AND c.paymob_order_id = t.paymob_order_id AND c.amount_cents = t.amount_cents
    AND c.amount_cents = t.expected_amount_cents AND c.currency = upper(t.currency)
  JOIN public.organizations o ON o.id = t.organization_id
  LEFT JOIN public.subscription_plans p ON p.id = t.plan_id
  WHERE t.status = 'success' AND t.hmac_valid IS TRUE AND t.amount_cents > 0
    AND t.subscription_activated_at IS NULL
    AND coalesce(t.processed_at, t.created_at) <= now() - interval '5 minutes';
END;
$$;

CREATE FUNCTION public.platform_billing_followup()
RETURNS TABLE (kind text, id uuid, organization_id uuid, company_name text, plan_name text, plan_name_ar text,
  event_at timestamptz, status text, amount numeric, currency text, reference text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM platform_company_private.billing_followup() $$;

REVOKE ALL ON FUNCTION platform_company_private.contact_gaps(), public.platform_company_contact_gaps(),
  platform_company_private.billing_followup(), public.platform_billing_followup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_company_private.contact_gaps(), public.platform_company_contact_gaps(),
  platform_company_private.billing_followup(), public.platform_billing_followup() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
