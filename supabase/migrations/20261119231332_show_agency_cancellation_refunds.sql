-- The settlement feature is installed separately. Keep existing agency agreements
-- available in environments where settlement records are not yet installed.
CREATE FUNCTION pilgrimage_portal_private.agency_cancellation_summary(_org uuid, _agreement uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
BEGIN
  IF to_regclass('public.pilgrimage_b2b_cancellations') IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'status', c.status,
      'credit_note', n.note_number,
      'refund', CASE WHEN r.id IS NOT NULL THEN jsonb_build_object(
        'status', CASE r.status WHEN 'paid' THEN 'paid' ELSE 'due' END,
        'amount', r.amount,
        'currency', r.currency
      ) END
    )
    FROM public.pilgrimage_b2b_cancellations c
    LEFT JOIN public.credit_notes n
      ON c.status = 'approved' AND n.id = c.credit_note_id AND n.organization_id = c.organization_id
      AND n.invoice_id = c.invoice_id AND n.status = 'applied'
    LEFT JOIN public.refund_requests r
      ON c.status = 'approved' AND r.id = c.refund_id AND r.organization_id = c.organization_id
      AND r.invoice_id = c.invoice_id AND r.pilgrimage_b2b_cancellation_id = c.id
      AND r.status IN ('approved', 'paid')
    WHERE c.organization_id = _org AND c.agreement_id = _agreement
    ORDER BY c.requested_at DESC, c.id DESC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION pilgrimage_portal_private.agency_cancellation_summary(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pilgrimage_agency_portal()
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
    'cancellation', pilgrimage_portal_private.agency_cancellation_summary(b.organization_id, b.id),
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
