-- Reconcile the one-time historical state after the owner confirmed that every
-- booking currently in the system is fully collected and fully paid.
-- The operation is explicit, atomic, idempotent, and leaves an audit trail.

BEGIN;

CREATE OR REPLACE FUNCTION public.preview_existing_bookings_settlement(_org uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public._can_read_org_finance(_org) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'customer_open_invoices', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.currency)
      FROM (
        SELECT upper(i.currency) AS currency, count(*)::integer AS documents,
               sum(i.remaining_amount)::numeric AS amount
        FROM public.invoices i
        WHERE i.organization_id = _org
          AND i.booking_id IS NOT NULL
          AND i.remaining_amount > 0.004
          AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
        GROUP BY upper(i.currency)
      ) x
    ), '[]'::jsonb),
    'supplier_open_invoices', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.currency)
      FROM (
        SELECT upper(i.currency) AS currency, count(*)::integer AS documents,
               sum(i.amount - i.amount_paid)::numeric AS amount
        FROM public.supplier_invoices i
        WHERE i.organization_id = _org
          AND i.booking_id IS NOT NULL
          AND i.amount - i.amount_paid > 0.004
          AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
        GROUP BY upper(i.currency)
      ) x
    ), '[]'::jsonb),
    'customer_control', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.currency)
      FROM (
        SELECT e.currency, sum(l.debit - l.credit)::numeric AS balance
        FROM public.journal_entries e
        JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
        JOIN public.chart_of_accounts a ON a.id = l.account_id
        WHERE e.organization_id = _org AND e.status = 'posted' AND a.account_code = '1100'
        GROUP BY e.currency
      ) x
    ), '[]'::jsonb),
    'supplier_control', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.currency)
      FROM (
        SELECT e.currency, sum(l.credit - l.debit)::numeric AS balance
        FROM public.journal_entries e
        JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
        JOIN public.chart_of_accounts a ON a.id = l.account_id
        WHERE e.organization_id = _org AND e.status = 'posted' AND a.account_code = '2000'
        GROUP BY e.currency
      ) x
    ), '[]'::jsonb),
    'unallocated_supplier_payments', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.currency)
      FROM (
        SELECT upper(COALESCE(p.currency, 'EGP')) AS currency,
               count(*)::integer AS payments, sum(p.amount)::numeric AS amount
        FROM public.supplier_payments p
        WHERE p.organization_id = _org
          AND p.booking_id IS NOT NULL
          AND lower(COALESCE(p.status, '')) IN ('paid', 'completed')
          AND NOT EXISTS (
            SELECT 1 FROM public.supplier_payment_allocations a
            WHERE a.supplier_payment_id = p.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.journal_entries je
            WHERE je.organization_id = _org
              AND je.source_type = 'legacy_supplier_payment'
              AND je.source_id = p.id
          )
        GROUP BY upper(COALESCE(p.currency, 'EGP'))
      ) x
    ), '[]'::jsonb),
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_existing_bookings_settlement(
  _org uuid,
  _confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run uuid;
  v_payment_id uuid;
  v_allocation_id uuid;
  v_journal_id uuid;
  v_cash uuid;
  v_ar uuid;
  v_ap uuid;
  v_supplier_advances uuid;
  v_amount numeric;
  v_date date;
  v_customer_linked integer := 0;
  v_customer_created integer := 0;
  v_supplier_linked integer := 0;
  v_supplier_created integer := 0;
  v_legacy_supplier_posted integer := 0;
  v_supplier_fallback integer := 0;
  v_open_customer integer;
  v_open_supplier integer;
  v_control_imbalance integer;
  v_result jsonb;
  r record;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN
    RAISE EXCEPTION 'Not authorized to execute historical settlement';
  END IF;
  IF _confirmation IS DISTINCT FROM 'SETTLE ALL EXISTING BOOKINGS' THEN
    RAISE EXCEPTION 'Explicit confirmation is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('existing-bookings-settlement:' || _org::text, 0));

  v_cash := public._resolve_account(_org, '1000');
  v_ar := public._resolve_account(_org, '1100');
  v_ap := public._resolve_account(_org, '2000');
  v_supplier_advances := public._resolve_account(_org, '1210');
  IF v_cash IS NULL OR v_ar IS NULL OR v_ap IS NULL OR v_supplier_advances IS NULL THEN
    RAISE EXCEPTION 'Cash, receivables, payables, or supplier advances control account is missing';
  END IF;

  -- A repeated confirmed call is a true no-op: it neither changes financial
  -- data nor creates an empty recovery run.
  IF NOT EXISTS (
       SELECT 1 FROM public.invoices i
       WHERE i.organization_id = _org AND i.booking_id IS NOT NULL
         AND i.remaining_amount > 0.004
         AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.supplier_invoices i
       WHERE i.organization_id = _org AND i.booking_id IS NOT NULL
         AND i.amount - i.amount_paid > 0.004
         AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.journal_entries e
       JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
       JOIN public.chart_of_accounts a ON a.id = l.account_id
       WHERE e.organization_id = _org AND e.status = 'posted'
         AND a.account_code IN ('1100', '2000')
       GROUP BY a.account_code, e.currency
       HAVING abs(sum(l.debit - l.credit)) > 0.01
     ) THEN
    RETURN jsonb_build_object(
      'status', 'already_settled',
      'open_customer_invoices_after', 0,
      'open_supplier_invoices_after', 0,
      'control_account_imbalances_after', 0,
      'finished_at', now()
    );
  END IF;

  INSERT INTO public.historical_recovery_runs (
    organization_id, mode, from_date, to_date, status, started_by
  ) VALUES (
    _org, 'execute', DATE '2022-05-22', CURRENT_DATE, 'running', auth.uid()
  ) RETURNING id INTO v_run;

  -- Customer invoices: reuse a matching unallocated receipt first. If the
  -- historical receipt record is absent, create a clearly labelled one.
  FOR r IN
    SELECT i.*
    FROM public.invoices i
    WHERE i.organization_id = _org
      AND i.booking_id IS NOT NULL
      AND i.remaining_amount > 0.004
      AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
    ORDER BY i.issued_date, i.id
    FOR UPDATE
  LOOP
    v_amount := r.remaining_amount;
    v_payment_id := NULL;

    SELECT p.id INTO v_payment_id
    FROM public.customer_payments p
    WHERE p.organization_id = _org
      AND p.status = 'completed'
      AND NOT p.is_demo
      AND p.currency = r.currency
      AND (p.invoice_id = r.id OR p.booking_id = r.booking_id)
      AND (p.customer_id IS NULL OR r.customer_id IS NULL OR p.customer_id = r.customer_id)
      AND p.amount - COALESCE((
        SELECT sum(a.amount) FROM public.customer_payment_allocations a WHERE a.payment_id = p.id
      ), 0) >= v_amount - 0.01
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.organization_id = _org AND je.source_type = 'customer_payment'
          AND je.source_id = p.id AND je.is_locked
      )
    ORDER BY (p.invoice_id = r.id) DESC, p.payment_date, p.id
    LIMIT 1;

    IF v_payment_id IS NULL THEN
      v_date := CASE
        WHEN r.issued_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE THEN r.issued_date
        ELSE LEAST(COALESCE(r.created_at::date, CURRENT_DATE), CURRENT_DATE)
      END;
      INSERT INTO public.customer_payments (
        organization_id, booking_id, customer_id, invoice_id, amount, currency,
        exchange_rate, amount_base, payment_method, reference_number, payment_date,
        notes, status, client_ref, created_by, is_demo
      ) VALUES (
        _org, r.booking_id, r.customer_id, r.id, v_amount, r.currency,
        COALESCE((
          SELECT je.fx_rate
          FROM public.journal_entries je
          WHERE je.organization_id = _org
            AND je.source_type = 'invoice' AND je.source_id = r.id
          ORDER BY je.created_at, je.id LIMIT 1
        ), 1),
        round(v_amount * COALESCE((
          SELECT je.fx_rate
          FROM public.journal_entries je
          WHERE je.organization_id = _org
            AND je.source_type = 'invoice' AND je.source_id = r.id
          ORDER BY je.created_at, je.id LIMIT 1
        ), 1), 2),
        'cash', 'LEGACY-SETTLE-' || r.invoice_number, v_date,
        '[HISTORICAL_SETTLEMENT] Owner confirmed the booking was fully collected',
        'completed', 'historical-settlement:' || r.id::text, auth.uid(), false
      ) RETURNING id INTO v_payment_id;
      v_customer_created := v_customer_created + 1;
    ELSE
      v_customer_linked := v_customer_linked + 1;
    END IF;

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, reason
    ) VALUES (
      '20260905_all_existing_bookings_settled', _org, 'customer_invoice', r.id,
      to_jsonb(r), 'Owner confirmed all existing bookings were fully collected'
    );

    INSERT INTO public.customer_payment_allocations (
      organization_id, payment_id, invoice_id, amount, amount_base, created_at
    ) VALUES (
      _org, v_payment_id, r.id, v_amount,
      round(v_amount * COALESCE((SELECT exchange_rate FROM public.customer_payments WHERE id = v_payment_id), 1), 2),
      now()
    ) RETURNING id INTO v_allocation_id;

    UPDATE public.invoices SET status = 'paid' WHERE id = r.id;

    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, booking_id, booking_number, entity_type, action, entity_id, detail
    ) SELECT v_run, _org, r.booking_id, b.booking_number, 'customer_settlement', 'created',
             v_allocation_id, 'Settled invoice ' || r.invoice_number || ' for ' || v_amount || ' ' || r.currency
      FROM public.bookings b WHERE b.id = r.booking_id;

    UPDATE public.financial_repair_audit
    SET after_data = (SELECT to_jsonb(i) FROM public.invoices i WHERE i.id = r.id)
    WHERE migration_key = '20260905_all_existing_bookings_settled'
      AND entity_type = 'customer_invoice' AND entity_id = r.id AND after_data IS NULL;
  END LOOP;

  -- Supplier invoices: allocate a matching historical payment where possible;
  -- otherwise create a labelled payment for the owner-confirmed settlement.
  FOR r IN
    SELECT i.*
    FROM public.supplier_invoices i
    WHERE i.organization_id = _org
      AND i.booking_id IS NOT NULL
      AND i.amount - i.amount_paid > 0.004
      AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft')
    ORDER BY i.invoice_date, i.id
    FOR UPDATE
  LOOP
    v_amount := r.amount - r.amount_paid;
    v_payment_id := NULL;

    SELECT p.id INTO v_payment_id
    FROM public.supplier_payments p
    WHERE p.organization_id = _org
      AND lower(COALESCE(p.status, '')) IN ('paid', 'completed')
      AND upper(COALESCE(p.currency, 'EGP')) = upper(r.currency)
      AND p.booking_id = r.booking_id
      AND p.supplier_id IS NOT DISTINCT FROM r.supplier_id
      AND p.amount - COALESCE((
        SELECT sum(a.amount) FROM public.supplier_payment_allocations a
        WHERE a.supplier_payment_id = p.id
      ), 0) >= v_amount - 0.01
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.organization_id = _org AND je.source_type = 'supplier_payment'
          AND je.source_id = p.id AND je.is_locked
      )
    ORDER BY COALESCE(p.paid_date, p.payment_date), p.id
    LIMIT 1;

    IF v_payment_id IS NULL THEN
      v_date := CASE
        WHEN r.invoice_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE THEN r.invoice_date
        ELSE LEAST(COALESCE(r.created_at::date, CURRENT_DATE), CURRENT_DATE)
      END;
      INSERT INTO public.supplier_payments (
        supplier_id, amount, currency, payment_date, paid_date, payment_method,
        reference_number, payment_reference, booking_id, notes, status, created_by,
        amount_in_egp, exchange_rate, organization_id, treasury_account_id
      ) VALUES (
        r.supplier_id, v_amount, r.currency, v_date, v_date, 'cash',
        'LEGACY-SETTLE-' || r.invoice_number, 'LEGACY-SETTLE-' || r.invoice_number,
        r.booking_id, '[HISTORICAL_SETTLEMENT] Owner confirmed the supplier was fully paid',
        'paid', auth.uid(), round(v_amount * COALESCE(r.exchange_rate, 1), 2),
        COALESCE(r.exchange_rate, 1), _org, NULL
      ) RETURNING id INTO v_payment_id;
      v_supplier_created := v_supplier_created + 1;
    ELSE
      v_supplier_linked := v_supplier_linked + 1;
    END IF;

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, reason
    ) VALUES (
      '20260905_all_existing_bookings_settled', _org, 'supplier_invoice', r.id,
      to_jsonb(r), 'Owner confirmed all existing bookings were fully paid to suppliers'
    );

    INSERT INTO public.supplier_payment_allocations (
      organization_id, supplier_payment_id, payment_order_id, supplier_invoice_id,
      amount, amount_base, created_at
    ) VALUES (
      _org, v_payment_id, r.payment_order_id, r.id, v_amount,
      round(v_amount * COALESCE((SELECT exchange_rate FROM public.supplier_payments WHERE id = v_payment_id), 1), 2),
      now()
    ) RETURNING id INTO v_allocation_id;

    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, booking_id, booking_number, entity_type, action, entity_id, detail
    ) SELECT v_run, _org, r.booking_id, b.booking_number, 'supplier_invoice_settlement', 'created',
             v_allocation_id, 'Settled supplier invoice ' || r.invoice_number || ' for ' || v_amount || ' ' || r.currency
      FROM public.bookings b WHERE b.id = r.booking_id;

    UPDATE public.financial_repair_audit
    SET after_data = (SELECT to_jsonb(i) FROM public.supplier_invoices i WHERE i.id = r.id)
    WHERE migration_key = '20260905_all_existing_bookings_settled'
      AND entity_type = 'supplier_invoice' AND entity_id = r.id AND after_data IS NULL;
  END LOOP;

  -- Older booking payments predate invoice-level supplier allocations. Their
  -- canonical journals currently debit Supplier Advances and credit Cash, so
  -- reclassify only the remaining booking AP from advances (never Cash again).
  FOR r IN
    SELECT p.*, b.booking_number, b.start_date, b.created_at AS booking_created_at
    FROM public.supplier_payments p
    JOIN public.bookings b ON b.id = p.booking_id AND b.organization_id = p.organization_id
    WHERE p.organization_id = _org
      AND lower(COALESCE(p.status, '')) IN ('paid', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.supplier_payment_allocations a WHERE a.supplier_payment_id = p.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.organization_id = _org
          AND je.source_type = 'legacy_supplier_payment'
          AND je.source_id = p.id
      )
    ORDER BY COALESCE(p.paid_date, p.payment_date), p.id
  LOOP
    SELECT GREATEST(COALESCE(sum(l.credit - l.debit), 0), 0) INTO v_amount
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    WHERE e.organization_id = _org AND e.status = 'posted'
      AND e.booking_id = r.booking_id
      AND e.currency = COALESCE(r.currency, 'EGP')
      AND a.account_code = '2000';
    v_amount := LEAST(v_amount, r.amount);
    IF v_amount < 0.005 THEN CONTINUE; END IF;

    v_date := CASE
      WHEN COALESCE(r.paid_date, r.payment_date) BETWEEN DATE '2000-01-01' AND CURRENT_DATE
        THEN COALESCE(r.paid_date, r.payment_date)
      WHEN r.start_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE THEN r.start_date
      ELSE LEAST(COALESCE(r.booking_created_at::date, CURRENT_DATE), CURRENT_DATE)
    END;

    INSERT INTO public.journal_entries (
      organization_id, entry_number, entry_date, reference_type, reference_id,
      description, total_debit, total_credit, status, currency, source_type,
      source_id, booking_id, functional_currency, fx_rate, posted_at, auto_generated
    ) VALUES (
      _org, public._next_entry_number(_org), v_date, 'legacy_supplier_payment', r.id,
      'تسوية سداد مورد تاريخي للحجز ' || r.booking_number,
      v_amount, v_amount, 'posted', COALESCE(r.currency, 'EGP'),
      'legacy_supplier_payment', r.id, r.booking_id, COALESCE(r.currency, 'EGP'),
      COALESCE(r.exchange_rate, 1), now(), true
    ) RETURNING id INTO v_journal_id;
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES
      (v_journal_id, v_ap, v_amount, 0, 'تسوية ذمم مورد تاريخية', 1),
      (v_journal_id, v_supplier_advances, 0, v_amount,
       'إعادة تصنيف دفعة مثبتة سابقاً من سلف الموردين', 2);

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, after_data, reason
    ) VALUES (
      '20260905_all_existing_bookings_settled', _org, 'supplier_payment', r.id,
      to_jsonb(r), jsonb_build_object('journal_entry_id', v_journal_id, 'settled_amount', v_amount),
      'Backfilled missing AP settlement journal from an existing paid supplier payment'
    );
    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, booking_id, booking_number, entity_type, action, entity_id, detail
    ) VALUES (
      v_run, _org, r.booking_id, r.booking_number, 'legacy_supplier_payment', 'created',
      v_journal_id, 'Posted existing payment for ' || v_amount || ' ' || COALESCE(r.currency, 'EGP')
    );
    v_legacy_supplier_posted := v_legacy_supplier_posted + 1;
  END LOOP;

  -- The owner confirmed that bookings with no imported payment row were also
  -- paid. Clear only the exact residual AP, labelled as an inferred cash method.
  FOR r IN
    SELECT e.booking_id, e.currency, b.booking_number,
           COALESCE(si.latest_invoice_date, b.start_date, b.created_at::date, CURRENT_DATE) AS source_date,
           sum(l.credit - l.debit)::numeric AS balance
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    JOIN public.bookings b ON b.id = e.booking_id AND b.organization_id = e.organization_id
    LEFT JOIN LATERAL (
      SELECT max(si0.invoice_date) AS latest_invoice_date
      FROM public.supplier_invoices si0
      WHERE si0.organization_id = e.organization_id AND si0.booking_id = e.booking_id
    ) si ON true
    WHERE e.organization_id = _org AND e.status = 'posted'
      AND a.account_code = '2000' AND e.booking_id IS NOT NULL
    GROUP BY e.booking_id, e.currency, b.booking_number, b.start_date, b.created_at,
             si.latest_invoice_date
    HAVING sum(l.credit - l.debit) > 0.004
    ORDER BY e.currency, b.booking_number
  LOOP
    v_date := CASE
      WHEN r.source_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE THEN r.source_date
      ELSE CURRENT_DATE
    END;
    INSERT INTO public.journal_entries (
      organization_id, entry_number, entry_date, reference_type, reference_id,
      description, total_debit, total_credit, status, currency, source_type,
      source_id, booking_id, functional_currency, fx_rate, posted_at, auto_generated
    ) VALUES (
      _org, public._next_entry_number(_org), v_date, 'legacy_supplier_settlement', r.booking_id,
      'تسوية مورد مؤكدة للحجز ' || r.booking_number || ' بدون سجل دفع مستورد',
      r.balance, r.balance, 'posted', r.currency, 'legacy_supplier_settlement',
      r.booking_id, r.booking_id, r.currency, 1, now(), true
    ) RETURNING id INTO v_journal_id;
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES
      (v_journal_id, v_ap, r.balance, 0, 'تسوية الرصيد المتبقي للمورد', 1),
      (v_journal_id, v_cash, 0, r.balance, 'طريقة السداد التاريخية مستنتجة: نقدي', 2);

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, after_data, reason
    ) VALUES (
      '20260905_all_existing_bookings_settled', _org, 'booking_supplier_balance', r.booking_id,
      jsonb_build_object('currency', r.currency, 'balance', r.balance),
      jsonb_build_object('journal_entry_id', v_journal_id, 'balance', 0),
      'Owner confirmed supplier was paid; payment row was not present in the historical import'
    );
    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, booking_id, booking_number, entity_type, action, entity_id, detail
    ) VALUES (
      v_run, _org, r.booking_id, r.booking_number, 'legacy_supplier_settlement', 'created',
      v_journal_id, 'Cleared residual AP for ' || r.balance || ' ' || r.currency || '; cash method inferred'
    );
    v_supplier_fallback := v_supplier_fallback + 1;
  END LOOP;

  SELECT count(*) INTO v_open_customer
  FROM public.invoices i
  WHERE i.organization_id = _org AND i.booking_id IS NOT NULL
    AND i.remaining_amount > 0.004
    AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft');
  SELECT count(*) INTO v_open_supplier
  FROM public.supplier_invoices i
  WHERE i.organization_id = _org AND i.booking_id IS NOT NULL
    AND i.amount - i.amount_paid > 0.004
    AND lower(i.status) NOT IN ('cancelled', 'canceled', 'void', 'draft');
  SELECT count(*) INTO v_control_imbalance
  FROM (
    SELECT a.account_code, e.currency, sum(l.debit - l.credit) AS balance
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    WHERE e.organization_id = _org AND e.status = 'posted'
      AND a.account_code IN ('1100', '2000')
    GROUP BY a.account_code, e.currency
    HAVING abs(sum(l.debit - l.credit)) > 0.01
  ) imbalances;

  IF v_open_customer <> 0 OR v_open_supplier <> 0 OR v_control_imbalance <> 0 THEN
    RAISE EXCEPTION 'Settlement verification failed: customer=%, supplier=%, controls=%',
      v_open_customer, v_open_supplier, v_control_imbalance;
  END IF;

  v_result := jsonb_build_object(
    'run_id', v_run,
    'customer_existing_payments_linked', v_customer_linked,
    'customer_payments_created', v_customer_created,
    'supplier_existing_payments_linked', v_supplier_linked,
    'supplier_payments_created', v_supplier_created,
    'legacy_supplier_payments_posted', v_legacy_supplier_posted,
    'supplier_fallback_settlements', v_supplier_fallback,
    'open_customer_invoices_after', v_open_customer,
    'open_supplier_invoices_after', v_open_supplier,
    'control_account_imbalances_after', v_control_imbalance,
    'finished_at', now()
  );

  UPDATE public.historical_recovery_runs
  SET status = 'completed', totals = v_result, finished_at = now()
  WHERE id = v_run;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_existing_bookings_settlement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_existing_bookings_settlement(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_existing_bookings_settlement(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_existing_bookings_settlement(uuid,text) TO authenticated, service_role;

COMMIT;
