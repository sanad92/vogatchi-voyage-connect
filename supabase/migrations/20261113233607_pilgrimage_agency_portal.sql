CREATE SCHEMA IF NOT EXISTS pilgrimage_portal_private;
REVOKE ALL ON SCHEMA pilgrimage_portal_private FROM PUBLIC, anon, authenticated;

CREATE TABLE pilgrimage_portal_private.agreement_access (
  agreement_id uuid PRIMARY KEY REFERENCES public.pilgrimage_b2b_agreements(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pilgrimage_portal_private.agreement_access (email);
ALTER TABLE pilgrimage_portal_private.agreement_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pilgrimage_portal_private.agreement_access FROM PUBLIC, anon, authenticated;

CREATE FUNCTION pilgrimage_portal_private.actor_email()
RETURNS text LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT lower(btrim(u.email)) FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND NOT EXISTS (SELECT FROM public.profiles p WHERE p.id = u.id AND p.is_active IS FALSE)
$$;

CREATE FUNCTION pilgrimage_portal_private.is_agency_contact(_agreement uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT FROM pilgrimage_portal_private.agreement_access g
    JOIN public.pilgrimage_b2b_agreements b ON b.id = g.agreement_id
    JOIN public.organizations o ON o.id = b.organization_id
    WHERE g.agreement_id = _agreement AND o.is_active IS TRUE
      AND g.email = pilgrimage_portal_private.actor_email()
  )
$$;

CREATE FUNCTION public.manage_pilgrimage_agency_portal(_agreement uuid, _change boolean DEFAULT false, _email text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_agreement public.pilgrimage_b2b_agreements%ROWTYPE;
  v_email text := nullif(lower(btrim(_email)), '');
BEGIN
  SELECT * INTO v_agreement FROM public.pilgrimage_b2b_agreements WHERE id = _agreement FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(public.can_org_write(v_agreement.organization_id), false)
    OR coalesce(public.get_user_org_role(auth.uid(), v_agreement.organization_id)::text, '') NOT IN ('owner', 'admin', 'manager') THEN
    RAISE EXCEPTION 'لا توجد صلاحية لإدارة دخول الوكيل.' USING ERRCODE = '42501';
  END IF;
  IF NOT _change THEN
    RETURN (SELECT g.email FROM pilgrimage_portal_private.agreement_access g WHERE g.agreement_id = _agreement);
  END IF;
  IF v_email IS NULL THEN
    DELETE FROM pilgrimage_portal_private.agreement_access WHERE agreement_id = _agreement;
    RETURN NULL;
  END IF;
  IF v_agreement.status <> 'approved_internal' OR char_length(v_email) > 254
    OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR public.is_free_email(v_email) THEN
    RAISE EXCEPTION 'أدخل بريد عمل صالحًا لاتفاق معتمد.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO pilgrimage_portal_private.agreement_access(agreement_id, email, granted_by)
  VALUES (_agreement, v_email, auth.uid())
  ON CONFLICT (agreement_id) DO UPDATE SET email = excluded.email, granted_by = excluded.granted_by, updated_at = now();
  RETURN v_email;
END;
$$;

CREATE FUNCTION public.get_pilgrimage_agency_portal()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'agency', a.name, 'operator', o.name, 'program', s.name,
    'departure', s.departure_date, 'return_date', s.return_date,
    'currency', b.currency, 'total', b.total_contract_amount, 'status', b.status,
    'capacity', CASE WHEN b.status = 'approved_internal' AND s.status = 'quoted' AND al.status = 'allocated' THEN al.seat_count ELSE 0 END,
    'invoice', (SELECT jsonb_build_object('number', i.invoice_number, 'paid', i.total_paid_amount, 'remaining', i.remaining_amount, 'status', i.status)
      FROM public.invoices i WHERE i.pilgrimage_b2b_agreement_id = b.id AND i.organization_id = b.organization_id
      AND i.status <> 'draft' ORDER BY i.created_at DESC, i.id DESC LIMIT 1),
    'roster', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.display_name, 'room_type', r.room_type)
      ORDER BY r.created_at, r.id), '[]'::jsonb) FROM public.pilgrimage_b2b_roster_entries r
      WHERE r.agreement_id = b.id AND r.organization_id = b.organization_id AND r.status = 'active')
  ) ORDER BY s.departure_date, b.id), '[]'::jsonb)
  FROM pilgrimage_portal_private.agreement_access g
  JOIN public.pilgrimage_b2b_agreements b ON b.id = g.agreement_id
  JOIN public.organizations o ON o.id = b.organization_id AND o.is_active IS TRUE
  JOIN public.pilgrimage_agencies a ON a.id = b.agency_id AND a.organization_id = b.organization_id
  JOIN public.pilgrimage_sales s ON s.id = b.sale_id AND s.organization_id = b.organization_id
  LEFT JOIN public.pilgrimage_seat_allocations al ON al.sale_id = s.id AND al.organization_id = b.organization_id
  WHERE g.email = pilgrimage_portal_private.actor_email() AND b.status IN ('approved_internal', 'voided')
$$;

-- Retain the existing roster validation, agreement lock and retry behavior.
DO $patch$
DECLARE
  v_definition text := pg_get_functiondef('public.add_pilgrimage_b2b_roster_name(uuid,uuid,text,text)'::regprocedure);
  v_filter text := 'WHERE id=_agreement_id AND public.user_belongs_to_org(actor,organization_id)';
  v_role text := $role$IF NOT FOUND OR public.get_user_org_role(actor,b.organization_id)::text
   NOT IN ('owner','admin','manager') THEN$role$;
BEGIN
  IF strpos(v_definition, v_filter) = 0 OR strpos(v_definition, v_role) = 0 THEN
    RAISE EXCEPTION 'Unexpected B2B roster authorization definition';
  END IF;
  EXECUTE replace(replace(v_definition, v_filter, 'WHERE id=_agreement_id'), v_role,
    $new$IF NOT FOUND OR (
    NOT (coalesce(public.user_belongs_to_org(actor,b.organization_id), false)
      AND coalesce(public.get_user_org_role(actor,b.organization_id)::text, '') IN ('owner','admin','manager'))
    AND NOT pilgrimage_portal_private.is_agency_contact(_agreement_id)) THEN$new$);
END;
$patch$;

REVOKE ALL ON FUNCTION public.get_pilgrimage_agency_portal(),
  public.manage_pilgrimage_agency_portal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pilgrimage_agency_portal(),
  public.manage_pilgrimage_agency_portal(uuid, boolean, text) TO authenticated;
