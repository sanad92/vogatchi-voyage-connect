BEGIN;

CREATE TABLE public.platform_company_followups (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  next_followup_at date,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_company_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_company_followups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.platform_company_followups TO authenticated;
GRANT UPDATE (assigned_to, next_followup_at, note, updated_by, updated_at) ON public.platform_company_followups TO authenticated;
CREATE POLICY platform_company_followups_admin ON public.platform_company_followups
  FOR ALL TO authenticated
  USING (coalesce(public.is_platform_admin((SELECT auth.uid())), false))
  WITH CHECK (
    coalesce(public.is_platform_admin((SELECT auth.uid())), false)
    AND updated_by = (SELECT auth.uid())
    AND (assigned_to IS NULL OR coalesce(public.is_platform_admin(assigned_to), false))
  );

CREATE SCHEMA platform_company_private;
REVOKE ALL ON SCHEMA platform_company_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA platform_company_private TO authenticated;

-- Cross-tenant operational milestones are visible to platform operators as dates
-- and counts. Quote, booking, ticket and payment payloads stay in their tables.
CREATE FUNCTION platform_company_private.activation(p_organization_id uuid, p_page integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page < 0 OR p_page > 100000 THEN
    RAISE EXCEPTION 'Invalid page' USING ERRCODE = '22023';
  END IF;

  WITH candidates AS (
    SELECT o.id, o.name, o.email, o.is_active, o.created_at,
      s.status AS subscription_status, s.expires_at, p.name AS plan_name, p.name_ar AS plan_name_ar
    FROM public.organizations o
    LEFT JOIN LATERAL (
      SELECT subs.status, subs.expires_at, subs.plan_id
      FROM public.subscriptions subs WHERE subs.organization_id = o.id AND subs.starts_at <= now()
      ORDER BY subs.created_at DESC, subs.id DESC LIMIT 1
    ) s ON true
    LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE (p_organization_id IS NOT NULL AND o.id = p_organization_id)
       OR (p_organization_id IS NULL AND o.is_active AND s.status = 'trialing'
           AND s.expires_at > now() AND s.expires_at <= now() + interval '168 hours')
  ), milestones AS (
    SELECT c.*,
      (SELECT min(q.created_at) FROM public.quotes q WHERE q.organization_id = c.id AND q.is_demo IS NOT TRUE) AS first_quote_at,
      b.first_booking_at, b.last_booking_at
    FROM candidates c
    CROSS JOIN LATERAL (
      SELECT min(first_at) AS first_booking_at, max(last_at) AS last_booking_at FROM (
        SELECT min(h.created_at) first_at, max(h.created_at) last_at FROM public.hotel_bookings h WHERE h.organization_id = c.id
        UNION ALL SELECT min(f.created_at), max(f.created_at) FROM public.flight_bookings f WHERE f.organization_id = c.id
        UNION ALL SELECT min(r.created_at), max(r.created_at) FROM public.car_rentals r WHERE r.organization_id = c.id
        UNION ALL SELECT min(t.created_at), max(t.created_at) FROM public.transport_bookings t WHERE t.organization_id = c.id
      ) dates
    ) b
  ), filtered AS MATERIALIZED (
    SELECT * FROM milestones WHERE p_organization_id IS NOT NULL OR (first_quote_at IS NULL AND first_booking_at IS NULL)
  ), page AS (
    SELECT * FROM filtered ORDER BY expires_at NULLS LAST, id LIMIT 15 OFFSET p_page * 15
  ), details AS (
    SELECT c.*,
      followup.assigned_to, followup.next_followup_at, followup.note, followup.updated_at AS followup_updated_at,
      coalesce(nullif(operator.full_name, ''), operator.email) AS assigned_name,
      greatest(c.last_booking_at, (SELECT max(q.created_at) FROM public.quotes q WHERE q.organization_id = c.id AND q.is_demo IS NOT TRUE)) AS last_activity_at,
      (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = c.id AND m.is_active) AS active_members,
      (SELECT count(*) FROM public.support_tickets t WHERE t.organization_id = c.id AND t.status NOT IN ('resolved','closed')) AS open_tickets,
      (SELECT count(*) FROM public.bank_transfer_requests b WHERE b.organization_id = c.id AND b.status = 'pending') AS pending_transfers,
      greatest(
        (SELECT max(b.reviewed_at) FROM public.bank_transfer_requests b
         JOIN public.platform_finance_entries e ON e.source = 'bank_transfer' AND e.source_id = b.id
         WHERE b.organization_id = c.id AND b.status = 'approved'),
        (SELECT max(t.subscription_activated_at) FROM public.payment_transactions t
         JOIN public.payment_checkout_sessions s ON s.id = t.checkout_session_id
         WHERE t.organization_id = c.id AND s.organization_id = c.id AND s.status = 'paid'
           AND s.provider_transaction_id = t.paymob_transaction_id AND t.status = 'success' AND t.hmac_valid)
      ) AS last_confirmed_payment_at
    FROM page c
    LEFT JOIN public.platform_company_followups followup ON followup.organization_id = c.id
    LEFT JOIN public.profiles operator ON operator.id = followup.assigned_to
      AND coalesce(public.is_platform_admin(followup.assigned_to), false)
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered),
    'rows', coalesce(jsonb_agg(to_jsonb(details) ORDER BY expires_at NULLS LAST, id), '[]'::jsonb))
  INTO v_result FROM details;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.platform_company_activation(p_organization_id uuid DEFAULT NULL, p_page integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_company_private.activation(p_organization_id, p_page) $$;

REVOKE EXECUTE ON FUNCTION platform_company_private.activation(uuid,integer), public.platform_company_activation(uuid,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_company_private.activation(uuid,integer), public.platform_company_activation(uuid,integer)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
