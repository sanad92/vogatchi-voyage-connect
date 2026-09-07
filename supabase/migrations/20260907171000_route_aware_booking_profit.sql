-- Booking profit cockpit follows company account routes.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_booking_profit_cockpit(_booking uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_currency text;
  v_selling numeric := 0;
  v_cost numeric := 0;
  v_gross numeric := 0;
  v_expenses numeric := 0;
  v_commissions numeric := 0;
  v_net numeric := 0;
  v_invoiced numeric := 0;
  v_collected numeric := 0;
  v_customer_doc_paid numeric := 0;
  v_customer_unallocated numeric := 0;
  v_customer_obligation numeric := 0;
  v_supplier_invoiced numeric := 0;
  v_supplier_paid numeric := 0;
  v_supplier_doc_paid numeric := 0;
  v_supplier_unallocated numeric := 0;
  v_supplier_obligation numeric := 0;
  v_customer_due numeric := 0;
  v_supplier_due numeric := 0;
  v_ledger_revenue numeric := 0;
  v_ledger_cost numeric := 0;
  v_ledger_expenses numeric := 0;
  v_foreign_rows integer := 0;
  v_posted_journals integer := 0;
  v_warnings jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public._can_read_org_finance(v_booking.organization_id) THEN
    RAISE EXCEPTION 'Not authorized to read booking financials' USING ERRCODE = '42501';
  END IF;

  v_currency := upper(coalesce(nullif(v_booking.currency, ''), 'EGP'));
  v_selling := coalesce(v_booking.selling_price, 0);
  v_cost := coalesce(v_booking.cost_price, 0);
  v_gross := v_selling - v_cost;

  SELECT coalesce(sum(i.final_amount), 0)
  INTO v_invoiced
  FROM public.invoices i
  WHERE i.booking_id = _booking
    AND lower(coalesce(i.status, '')) NOT IN ('cancelled', 'canceled', 'void')
    AND upper(coalesce(i.currency, v_currency)) = v_currency;

  -- Historical invoices may already carry a paid balance without a receipt row.
  -- Compare sources per invoice instead of adding them, then use truly unlinked
  -- booking receipts only to fill any remaining gap.
  SELECT coalesce(sum(least(i.final_amount, greatest(
    coalesce(i.total_paid_amount, 0),
    coalesce((SELECT sum(a.amount)
      FROM public.customer_payment_allocations a
      JOIN public.customer_payments p ON p.id = a.payment_id
      WHERE a.invoice_id = i.id
        AND lower(coalesce(p.status, '')) IN ('completed', 'succeeded', 'paid')
        AND upper(coalesce(p.currency, v_currency)) = v_currency), 0),
    coalesce((SELECT sum(p.amount)
      FROM public.customer_payments p
      WHERE p.invoice_id = i.id
        AND lower(coalesce(p.status, '')) IN ('completed', 'succeeded', 'paid')
        AND upper(coalesce(p.currency, v_currency)) = v_currency
        AND NOT EXISTS (SELECT 1 FROM public.customer_payment_allocations a WHERE a.payment_id = p.id)), 0)
  ))), 0)
  INTO v_customer_doc_paid
  FROM public.invoices i
  WHERE i.booking_id = _booking
    AND lower(coalesce(i.status, '')) NOT IN ('cancelled', 'canceled', 'void')
    AND upper(coalesce(i.currency, v_currency)) = v_currency;

  SELECT coalesce(sum(p.amount), 0)
  INTO v_customer_unallocated
  FROM public.customer_payments p
  WHERE p.booking_id = _booking
    AND p.invoice_id IS NULL
    AND lower(coalesce(p.status, '')) IN ('completed', 'succeeded', 'paid')
    AND upper(coalesce(p.currency, v_currency)) = v_currency
    AND NOT EXISTS (SELECT 1 FROM public.customer_payment_allocations a WHERE a.payment_id = p.id);

  v_customer_obligation := CASE WHEN v_invoiced > 0 THEN v_invoiced ELSE v_selling END;
  v_collected := least(v_customer_obligation, v_customer_doc_paid + least(v_customer_unallocated, greatest(v_customer_obligation - v_customer_doc_paid, 0)));

  SELECT coalesce(sum(si.amount), 0)
  INTO v_supplier_invoiced
  FROM public.supplier_invoices si
  WHERE si.booking_id = _booking
    AND lower(coalesce(si.status, '')) NOT IN ('cancelled', 'canceled', 'void')
    AND upper(coalesce(si.currency, v_currency)) = v_currency;

  SELECT coalesce(sum(least(si.amount, greatest(
    coalesce(si.amount_paid, 0),
    coalesce((SELECT sum(a.amount)
      FROM public.supplier_payment_allocations a
      JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
      WHERE a.supplier_invoice_id = si.id
        AND lower(coalesce(p.status, '')) IN ('paid', 'completed', 'succeeded')
        AND upper(coalesce(p.currency, v_currency)) = v_currency), 0)
  ))), 0)
  INTO v_supplier_doc_paid
  FROM public.supplier_invoices si
  WHERE si.booking_id = _booking
    AND lower(coalesce(si.status, '')) NOT IN ('cancelled', 'canceled', 'void')
    AND upper(coalesce(si.currency, v_currency)) = v_currency;

  SELECT coalesce(sum(p.amount), 0)
  INTO v_supplier_unallocated
  FROM public.supplier_payments p
  WHERE p.booking_id = _booking
    AND lower(coalesce(p.status, '')) IN ('paid', 'completed', 'succeeded')
    AND upper(coalesce(p.currency, v_currency)) = v_currency
    AND NOT EXISTS (SELECT 1 FROM public.supplier_payment_allocations a WHERE a.supplier_payment_id = p.id);

  v_supplier_obligation := CASE WHEN v_supplier_invoiced > 0 THEN v_supplier_invoiced ELSE v_cost END;
  v_supplier_paid := least(v_supplier_obligation, v_supplier_doc_paid + least(v_supplier_unallocated, greatest(v_supplier_obligation - v_supplier_doc_paid, 0)));

  SELECT coalesce(sum(e.amount), 0)
  INTO v_expenses
  FROM public.expense_transactions e
  WHERE e.booking_id = _booking
    AND lower(coalesce(e.status, 'approved')) NOT IN ('cancelled', 'canceled', 'rejected', 'void', 'draft')
    AND upper(coalesce(e.currency, v_currency)) = v_currency;

  SELECT coalesce(sum(c.commission_amount), 0)
  INTO v_commissions
  FROM public.employee_commissions c
  WHERE c.booking_id = _booking
    AND lower(coalesce(c.payment_status, 'accrued')) NOT IN ('cancelled', 'canceled', 'rejected', 'void')
    AND upper(coalesce(c.currency, v_currency)) = v_currency;

  v_net := v_gross - v_expenses - v_commissions;
  v_customer_due := greatest(v_customer_obligation - v_collected, 0);
  v_supplier_due := greatest(v_supplier_obligation - v_supplier_paid, 0);

  SELECT
    coalesce(sum(CASE WHEN a.account_type = 'revenue' THEN l.credit - l.debit ELSE 0 END), 0),
    coalesce(sum(CASE WHEN a.id IN (public.get_org_account_route(v_booking.organization_id, 'cost_hotel'), public.get_org_account_route(v_booking.organization_id, 'cost_flight'), public.get_org_account_route(v_booking.organization_id, 'cost_transport'), public.get_org_account_route(v_booking.organization_id, 'cost_car_rental')) THEN l.debit - l.credit ELSE 0 END), 0),
    coalesce(sum(CASE WHEN a.account_type = 'expense' AND a.id NOT IN (public.get_org_account_route(v_booking.organization_id, 'cost_hotel'), public.get_org_account_route(v_booking.organization_id, 'cost_flight'), public.get_org_account_route(v_booking.organization_id, 'cost_transport'), public.get_org_account_route(v_booking.organization_id, 'cost_car_rental')) THEN l.debit - l.credit ELSE 0 END), 0),
    count(DISTINCT j.id)::integer
  INTO v_ledger_revenue, v_ledger_cost, v_ledger_expenses, v_posted_journals
  FROM public.journal_entries j
  JOIN public.journal_entry_lines l ON l.journal_entry_id = j.id
  JOIN public.chart_of_accounts a ON a.id = l.account_id
  WHERE j.booking_id = _booking
    AND j.status = 'posted'
    AND upper(coalesce(j.currency, v_currency)) = v_currency;

  SELECT count(*)::integer INTO v_foreign_rows
  FROM (
    SELECT currency FROM public.invoices WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.customer_payments WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.supplier_invoices WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.supplier_payments WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.expense_transactions WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.employee_commissions WHERE booking_id = _booking
    UNION ALL SELECT currency FROM public.journal_entries WHERE booking_id = _booking
  ) currencies
  WHERE upper(coalesce(currency, v_currency)) <> v_currency;

  IF v_invoiced = 0 AND lower(coalesce(v_booking.status, '')) IN ('confirmed', 'completed') THEN
    v_warnings := v_warnings || jsonb_build_array('لا توجد فاتورة عميل للحجز المؤكد.');
  ELSIF v_invoiced > 0 AND abs(v_invoiced - v_selling) > 0.01 THEN
    v_warnings := v_warnings || jsonb_build_array('إجمالي فواتير العميل لا يطابق سعر البيع.');
  END IF;
  IF v_cost > 0 AND v_supplier_invoiced = 0 AND lower(coalesce(v_booking.status, '')) IN ('confirmed', 'completed') THEN
    v_warnings := v_warnings || jsonb_build_array('لا توجد فاتورة مورد رغم وجود تكلفة للحجز.');
  ELSIF v_supplier_invoiced > 0 AND abs(v_supplier_invoiced - v_cost) > 0.01 THEN
    v_warnings := v_warnings || jsonb_build_array('إجمالي فواتير المورد لا يطابق تكلفة الحجز.');
  END IF;
  IF abs(coalesce(v_booking.profit, v_gross) - v_gross) > 0.01 THEN
    v_warnings := v_warnings || jsonb_build_array('الربح المخزن بالحجز لا يطابق البيع ناقص التكلفة.');
  END IF;
  IF v_net < 0 THEN
    v_warnings := v_warnings || jsonb_build_array('صافي مساهمة الحجز سالب.');
  END IF;
  IF v_foreign_rows > 0 THEN
    v_warnings := v_warnings || jsonb_build_array(format('تم استبعاد %s حركة بعملة مختلفة عن عملة الحجز.', v_foreign_rows));
  END IF;
  IF v_posted_journals > 0 AND (abs(v_ledger_revenue - v_selling) > 0.01 OR abs(v_ledger_cost - v_cost) > 0.01) THEN
    v_warnings := v_warnings || jsonb_build_array('الأرقام المرحلة بدفتر الأستاذ لا تطابق البيع أو التكلفة المخططة.');
  END IF;

  SELECT jsonb_build_object(
    'booking', jsonb_build_object(
      'id', v_booking.id, 'booking_number', v_booking.booking_number, 'status', v_booking.status,
      'customer_name', v_booking.customer_name, 'supplier_name', v_booking.supplier_name, 'currency', v_currency
    ),
    'summary', jsonb_build_object(
      'selling', v_selling, 'supplier_cost', v_cost, 'gross_profit', v_gross,
      'gross_margin_pct', CASE WHEN v_selling <> 0 THEN round(v_gross / v_selling * 100, 2) ELSE 0 END,
      'direct_expenses', v_expenses, 'commissions', v_commissions, 'net_contribution', v_net,
      'net_margin_pct', CASE WHEN v_selling <> 0 THEN round(v_net / v_selling * 100, 2) ELSE 0 END,
      'customer_invoiced', v_invoiced, 'customer_collected', v_collected, 'customer_remaining', v_customer_due,
      'customer_due_basis', CASE WHEN v_invoiced > 0 THEN 'customer_invoices' ELSE 'booking_selling' END,
      'supplier_invoiced', v_supplier_invoiced, 'supplier_paid', v_supplier_paid, 'supplier_remaining', v_supplier_due,
      'supplier_due_basis', CASE WHEN v_supplier_invoiced > 0 THEN 'supplier_invoices' ELSE 'booking_cost' END
    ),
    'settlement', jsonb_build_object(
      'customer_settled', v_customer_due <= 0.01 AND v_customer_obligation > 0,
      'supplier_settled', v_supplier_due <= 0.01,
      'financially_complete', v_customer_due <= 0.01 AND v_customer_obligation > 0 AND v_supplier_due <= 0.01,
      'customer_progress_pct', CASE WHEN v_customer_obligation > 0 THEN least(round(v_collected / v_customer_obligation * 100, 2), 100) ELSE 0 END,
      'supplier_progress_pct', CASE WHEN v_supplier_obligation > 0
        THEN least(round(v_supplier_paid / v_supplier_obligation * 100, 2), 100)
        ELSE 100 END
    ),
    'ledger', jsonb_build_object(
      'posted_revenue', v_ledger_revenue, 'posted_cost', v_ledger_cost, 'posted_expenses', v_ledger_expenses,
      'posted_net', v_ledger_revenue - v_ledger_cost - v_ledger_expenses, 'journal_count', v_posted_journals
    ),
    'warnings', v_warnings,
    'drilldowns', jsonb_build_object(
      'invoices', coalesce((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'number', i.invoice_number, 'date', i.issued_date, 'amount', i.final_amount, 'paid', i.total_paid_amount, 'status', i.status, 'currency', i.currency) ORDER BY i.issued_date) FROM public.invoices i WHERE i.booking_id = _booking), '[]'::jsonb),
      'customer_payments', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'number', p.reference_number, 'date', p.payment_date, 'amount', p.amount, 'status', p.status, 'currency', p.currency) ORDER BY p.payment_date) FROM public.customer_payments p WHERE p.booking_id = _booking OR EXISTS (SELECT 1 FROM public.customer_payment_allocations a JOIN public.invoices i ON i.id = a.invoice_id WHERE a.payment_id = p.id AND i.booking_id = _booking)), '[]'::jsonb),
      'supplier_invoices', coalesce((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'number', i.invoice_number, 'date', i.invoice_date, 'amount', i.amount, 'paid', i.amount_paid, 'status', i.status, 'currency', i.currency) ORDER BY i.invoice_date) FROM public.supplier_invoices i WHERE i.booking_id = _booking), '[]'::jsonb),
      'supplier_payments', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'number', p.reference_number, 'date', coalesce(p.paid_date, p.payment_date), 'amount', p.amount, 'status', p.status, 'currency', p.currency) ORDER BY coalesce(p.paid_date, p.payment_date)) FROM public.supplier_payments p WHERE p.booking_id = _booking OR EXISTS (SELECT 1 FROM public.supplier_payment_allocations a JOIN public.supplier_invoices i ON i.id = a.supplier_invoice_id WHERE a.supplier_payment_id = p.id AND i.booking_id = _booking)), '[]'::jsonb),
      'expenses', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'number', e.transaction_number, 'date', e.transaction_date, 'description', e.description, 'amount', e.amount, 'status', e.status, 'currency', e.currency) ORDER BY e.transaction_date) FROM public.expense_transactions e WHERE e.booking_id = _booking), '[]'::jsonb),
      'commissions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'date', c.commission_date, 'amount', c.commission_amount, 'rate', c.commission_rate, 'status', c.payment_status, 'currency', c.currency) ORDER BY c.commission_date) FROM public.employee_commissions c WHERE c.booking_id = _booking), '[]'::jsonb),
      'journals', coalesce((SELECT jsonb_agg(jsonb_build_object('id', j.id, 'number', j.entry_number, 'date', j.entry_date, 'description', j.description, 'debit', j.total_debit, 'credit', j.total_credit, 'status', j.status, 'currency', j.currency) ORDER BY j.entry_date) FROM public.journal_entries j WHERE j.booking_id = _booking), '[]'::jsonb)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_booking_profit_cockpit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_profit_cockpit(uuid) TO authenticated, service_role;

COMMIT;
