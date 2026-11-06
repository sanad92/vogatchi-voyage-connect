-- Safar ERP 2.0: tenant-explicit Operations Command Center.
-- Retains legacy RPC for older clients; the new UI calls v2 only.
-- Deployment requires authenticated, cross-organization acceptance testing.

CREATE OR REPLACE FUNCTION public.get_ops_command_center_v2(
  p_organization_id uuid,
  p_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_organization_id IS NULL OR auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = p_organization_id
        AND m.user_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'forbidden: organization membership required'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'arrivals_today', (
      SELECT count(*) FROM public.bookings b
      WHERE b.organization_id = p_organization_id AND b.start_date = p_date
    ),
    'departures_today', (
      SELECT count(*) FROM public.bookings b
      WHERE b.organization_id = p_organization_id AND b.end_date = p_date
    ),
    'checkins_next_7', (
      SELECT count(*) FROM public.bookings b
      WHERE b.organization_id = p_organization_id
        AND b.start_date BETWEEN p_date AND p_date + 7
    ),
    'pending_customer_payments', (
      SELECT coalesce(sum(i.total_amount - coalesce(i.paid_amount, 0)), 0)
      FROM public.invoices i
      WHERE i.organization_id = p_organization_id
        AND coalesce(i.paid_amount, 0) < i.total_amount
    ),
    'pending_supplier_pos', (
      SELECT count(*) FROM public.supplier_payment_orders o
      WHERE o.organization_id = p_organization_id
        AND o.status IN ('pending', 'approved')
    ),
    'overdue_tasks', (
      SELECT count(*) FROM public.booking_tasks t
      WHERE t.organization_id = p_organization_id
        AND t.status IN ('open', 'in_progress', 'pending')
        AND t.due_at < now()
    ),
    'today_tasks', (
      SELECT count(*) FROM public.booking_tasks t
      WHERE t.organization_id = p_organization_id
        AND t.status IN ('open', 'in_progress', 'pending')
        AND t.due_at::date = p_date
    ),
    'failed_events', (
      SELECT count(*) FROM public.event_deliveries d
      JOIN public.domain_events e ON e.id = d.event_id
      WHERE e.organization_id = p_organization_id
        AND d.status IN ('failed', 'dead')
    ),
    'whatsapp_failures_24h', (
      SELECT count(*) FROM public.whatsapp_messages w
      WHERE w.organization_id = p_organization_id
        AND w.status = 'failed'
        AND w.created_at > now() - interval '24 hours'
    ),
    'refund_approvals', (
      SELECT count(*) FROM public.refund_requests r
      WHERE r.organization_id = p_organization_id AND r.status = 'pending'
    ),
    -- This is customer cash collected, not accounting revenue.
    'revenue_today', (
      SELECT coalesce(sum(p.amount), 0) FROM public.customer_payments p
      WHERE p.organization_id = p_organization_id
        AND p.payment_date::date = p_date
    ),
    -- Preliminary profit on bookings updated that day, not a daily P&L.
    'profit_today', (
      SELECT coalesce(sum(b.profit), 0) FROM public.bookings b
      WHERE b.organization_id = p_organization_id
        AND b.updated_at::date = p_date
        AND b.workflow_stage IN ('paid', 'operations', 'traveling', 'completed', 'post_travel')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_ops_command_center_v2(uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ops_command_center_v2(uuid, date)
  TO authenticated;
