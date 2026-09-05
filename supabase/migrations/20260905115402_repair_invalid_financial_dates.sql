-- Repair impossible historical dates only when a deterministic source date
-- exists. The operation is explicit, atomic, idempotent, and fully audited.

BEGIN;

CREATE OR REPLACE FUNCTION public.repair_invalid_financial_dates(
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
  v_supplier_payments integer := 0;
  v_opening_entries integer := 0;
  v_invalid_sources integer;
  v_invalid_journals integer;
  v_old_journal jsonb;
  v_new_journal jsonb;
  v_target_date date;
  v_result jsonb;
  r record;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN
    RAISE EXCEPTION 'Not authorized to repair financial dates';
  END IF;
  IF _confirmation IS DISTINCT FROM 'REPAIR INVALID FINANCIAL DATES' THEN
    RAISE EXCEPTION 'Explicit confirmation is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('repair-invalid-financial-dates:' || _org::text, 0));

  SELECT count(*) INTO v_invalid_sources
  FROM public.supplier_payments p
  WHERE p.organization_id = _org
    AND (
      p.payment_date < DATE '2000-01-01'
      OR p.paid_date < DATE '2000-01-01'
    );
  SELECT count(*) INTO v_invalid_journals
  FROM public.journal_entries e
  WHERE e.organization_id = _org
    AND e.entry_date < DATE '2000-01-01';

  IF v_invalid_sources = 0 AND v_invalid_journals = 0 THEN
    RETURN jsonb_build_object(
      'status', 'already_repaired',
      'supplier_payments_repaired', 0,
      'opening_entries_repaired', 0,
      'invalid_source_dates_after', 0,
      'invalid_journal_dates_after', 0,
      'finished_at', now()
    );
  END IF;

  INSERT INTO public.historical_recovery_runs (
    organization_id, mode, from_date, to_date, status, started_by
  ) VALUES (
    _org, 'execute', DATE '2000-01-01', CURRENT_DATE, 'running', auth.uid()
  ) RETURNING id INTO v_run;

  -- A supplier-payment year is repaired only when the linked booking has a
  -- valid start date with the same month and day. This proves a mistyped year
  -- without guessing the intended business date.
  FOR r IN
    SELECT
      p.id,
      p.booking_id,
      p.payment_date,
      p.paid_date,
      p.organization_id,
      p.currency,
      b.booking_number,
      b.start_date AS target_date,
      to_jsonb(p) AS payment_before
    FROM public.supplier_payments p
    JOIN public.bookings b
      ON b.id = p.booking_id AND b.organization_id = p.organization_id
    WHERE p.organization_id = _org
      AND (
        p.payment_date < DATE '2000-01-01'
        OR p.paid_date < DATE '2000-01-01'
      )
      AND b.start_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE
      AND EXTRACT(MONTH FROM b.start_date) =
          EXTRACT(MONTH FROM COALESCE(p.paid_date, p.payment_date))
      AND EXTRACT(DAY FROM b.start_date) =
          EXTRACT(DAY FROM COALESCE(p.paid_date, p.payment_date))
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    SELECT to_jsonb(e) || jsonb_build_object(
      'lines', COALESCE((
        SELECT jsonb_agg(to_jsonb(l) ORDER BY l.line_order, l.id)
        FROM public.journal_entry_lines l
        WHERE l.journal_entry_id = e.id
      ), '[]'::jsonb)
    ) INTO v_old_journal
    FROM public.journal_entries e
    WHERE e.organization_id = _org
      AND e.source_type = 'supplier_payment'
      AND e.source_id = r.id;

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, reason
    ) VALUES (
      '20260905_invalid_financial_dates', _org, 'supplier_payment', r.id,
      jsonb_build_object(
        'payment', r.payment_before,
        'journal', v_old_journal,
        'booking_start_date', r.target_date
      ),
      'Invalid supplier-payment year repaired from linked booking start date with identical month and day'
    );

    UPDATE public.supplier_payments
    SET
      payment_date = r.target_date,
      paid_date = r.target_date
    WHERE id = r.id;

    SELECT to_jsonb(e) || jsonb_build_object(
      'lines', COALESCE((
        SELECT jsonb_agg(to_jsonb(l) ORDER BY l.line_order, l.id)
        FROM public.journal_entry_lines l
        WHERE l.journal_entry_id = e.id
      ), '[]'::jsonb)
    ) INTO v_new_journal
    FROM public.journal_entries e
    WHERE e.organization_id = _org
      AND e.source_type = 'supplier_payment'
      AND e.source_id = r.id;

    UPDATE public.financial_repair_audit
    SET after_data = jsonb_build_object(
      'payment', (
        SELECT to_jsonb(p) FROM public.supplier_payments p WHERE p.id = r.id
      ),
      'journal', v_new_journal
    )
    WHERE migration_key = '20260905_invalid_financial_dates'
      AND organization_id = _org
      AND entity_type = 'supplier_payment'
      AND entity_id = r.id
      AND after_data IS NULL;

    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, booking_id, booking_number,
      entity_type, action, entity_id, detail
    ) VALUES (
      v_run, _org, r.booking_id, r.booking_number,
      'supplier_payment_date_repair', 'created', r.id,
      'Corrected supplier payment date to ' || r.target_date::text ||
      ' from the linked booking start date'
    );
    v_supplier_payments := v_supplier_payments + 1;
  END LOOP;

  -- Launch opening entries must precede the organization's earliest valid
  -- posted journal in the same currency. Every invalid opening for that
  -- currency receives the same deterministic date.
  FOR r IN
    SELECT
      e.id,
      e.currency,
      e.entry_number,
      e.entry_date,
      to_jsonb(e) || jsonb_build_object(
        'lines', COALESCE((
          SELECT jsonb_agg(to_jsonb(l) ORDER BY l.line_order, l.id)
          FROM public.journal_entry_lines l
          WHERE l.journal_entry_id = e.id
        ), '[]'::jsonb)
      ) AS entry_before
    FROM public.journal_entries e
    WHERE e.organization_id = _org
      AND e.source_type = 'launch_opening_balance'
      AND e.entry_date < DATE '2000-01-01'
    ORDER BY e.currency, e.id
    FOR UPDATE OF e
  LOOP
    SELECT min(e.entry_date) - 1 INTO v_target_date
    FROM public.journal_entries e
    WHERE e.organization_id = _org
      AND e.currency = r.currency
      AND e.status = 'posted'
      AND e.source_type IS DISTINCT FROM 'launch_opening_balance'
      AND e.entry_date BETWEEN DATE '2000-01-01' AND CURRENT_DATE;

    IF v_target_date IS NULL THEN
      RAISE EXCEPTION 'No valid journal date can anchor opening entry %', r.id;
    END IF;

    INSERT INTO public.financial_repair_audit (
      migration_key, organization_id, entity_type, entity_id, before_data, reason
    ) VALUES (
      '20260905_invalid_financial_dates', _org, 'journal_entry', r.id,
      r.entry_before,
      'Invalid launch opening date moved to one day before the earliest valid posted journal in its currency'
    );

    UPDATE public.journal_entries
    SET entry_date = v_target_date
    WHERE id = r.id;

    UPDATE public.financial_repair_audit
    SET after_data = (
      SELECT to_jsonb(e) || jsonb_build_object(
        'lines', COALESCE((
          SELECT jsonb_agg(to_jsonb(l) ORDER BY l.line_order, l.id)
          FROM public.journal_entry_lines l
          WHERE l.journal_entry_id = e.id
        ), '[]'::jsonb)
      )
      FROM public.journal_entries e
      WHERE e.id = r.id
    )
    WHERE migration_key = '20260905_invalid_financial_dates'
      AND organization_id = _org
      AND entity_type = 'journal_entry'
      AND entity_id = r.id
      AND after_data IS NULL;

    INSERT INTO public.historical_recovery_items (
      run_id, organization_id, entity_type, action, entity_id, detail
    ) VALUES (
      v_run, _org, 'opening_balance_date_repair', 'created', r.id,
      'Corrected ' || r.entry_number || ' from ' || r.entry_date::text ||
      ' to ' || v_target_date::text
    );
    v_opening_entries := v_opening_entries + 1;
  END LOOP;

  SELECT count(*) INTO v_invalid_sources
  FROM public.supplier_payments p
  WHERE p.organization_id = _org
    AND (
      p.payment_date < DATE '2000-01-01'
      OR p.paid_date < DATE '2000-01-01'
    );
  SELECT count(*) INTO v_invalid_journals
  FROM public.journal_entries e
  WHERE e.organization_id = _org
    AND e.entry_date < DATE '2000-01-01';

  IF v_invalid_sources <> 0 OR v_invalid_journals <> 0 THEN
    RAISE EXCEPTION 'Date repair verification failed: source=%, journals=%',
      v_invalid_sources, v_invalid_journals;
  END IF;

  v_result := jsonb_build_object(
    'status', 'completed',
    'run_id', v_run,
    'supplier_payments_repaired', v_supplier_payments,
    'opening_entries_repaired', v_opening_entries,
    'invalid_source_dates_after', v_invalid_sources,
    'invalid_journal_dates_after', v_invalid_journals,
    'finished_at', now()
  );

  UPDATE public.historical_recovery_runs
  SET status = 'completed', totals = v_result, finished_at = now()
  WHERE id = v_run;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_invalid_financial_dates(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_invalid_financial_dates(uuid,text)
  TO authenticated, service_role;

COMMIT;
