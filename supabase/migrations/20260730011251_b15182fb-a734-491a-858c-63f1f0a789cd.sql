
-- ============ TABLES ============
CREATE TABLE public.historical_recovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('audit','simulate','execute','gl_replay')),
  fiscal_year int,
  from_date date NOT NULL,
  to_date date NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.historical_recovery_runs TO authenticated;
GRANT ALL ON public.historical_recovery_runs TO service_role;
ALTER TABLE public.historical_recovery_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recovery_runs_read" ON public.historical_recovery_runs FOR SELECT TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "recovery_runs_manage" ON public.historical_recovery_runs FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager') OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager') OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.historical_recovery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.historical_recovery_runs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  booking_id uuid,
  booking_number text,
  entity_type text NOT NULL,
  action text NOT NULL CHECK (action IN ('created','skipped','would_create','failed','verified')),
  entity_id uuid,
  detail text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recovery_items_run ON public.historical_recovery_items(run_id);
CREATE INDEX idx_recovery_items_org ON public.historical_recovery_items(organization_id);
GRANT SELECT ON public.historical_recovery_items TO authenticated;
GRANT ALL ON public.historical_recovery_items TO service_role;
ALTER TABLE public.historical_recovery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recovery_items_read" ON public.historical_recovery_items FOR SELECT TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.fiscal_year_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reconciled','closed')),
  reconciliation jsonb NOT NULL DEFAULT '{}'::jsonb,
  reconciled_at timestamptz,
  confirmed_by uuid,
  confirmed_at timestamptz,
  closed_by uuid,
  closed_at timestamptz,
  reopened_by uuid,
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, fiscal_year)
);
GRANT SELECT ON public.fiscal_year_closures TO authenticated;
GRANT ALL ON public.fiscal_year_closures TO service_role;
ALTER TABLE public.fiscal_year_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_closures_read" ON public.fiscal_year_closures FOR SELECT TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_recovery_runs_updated BEFORE UPDATE ON public.historical_recovery_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fiscal_closures_updated BEFORE UPDATE ON public.fiscal_year_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ GUARD ============
CREATE OR REPLACE FUNCTION public._recovery_can_manage(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_user_org_role(auth.uid(), _org) IN ('owner','admin','manager')
      OR public.is_platform_admin(auth.uid());
$$;

-- ============ PHASE 1: READ-ONLY AUDIT ============
CREATE OR REPLACE FUNCTION public.audit_historical_gaps(_org uuid, _from date DEFAULT '2022-05-22', _to date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  booking_id uuid, booking_number text, created_on date, workflow_stage text,
  customer_id uuid, supplier_id uuid, selling_price numeric, cost_price numeric, currency text,
  missing_invoice boolean, missing_supplier_po boolean, missing_voucher boolean,
  missing_snapshot boolean, missing_automation_run boolean, missing_timeline boolean,
  missing_workflow_history boolean, missing_events boolean, missing_gl boolean,
  no_customer boolean, no_supplier boolean, zero_price boolean, negative_margin boolean,
  gap_count int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH b AS (
    SELECT * FROM public.bookings
    WHERE organization_id = _org
      AND (auth.uid() IS NULL OR _org = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()))
      AND created_at::date BETWEEN _from AND _to
  ), f AS (
    SELECT b.id, b.booking_number, b.created_at::date AS created_on, b.workflow_stage::text AS stage,
      b.customer_id, b.supplier_id, b.selling_price, b.cost_price, COALESCE(b.currency,'EGP') AS currency,
      NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.booking_id = b.id) AS m_inv,
      (b.supplier_id IS NOT NULL AND COALESCE(b.cost_price,0) > 0
        AND NOT EXISTS (SELECT 1 FROM public.supplier_payment_orders p WHERE p.booking_id = b.id)) AS m_po,
      NOT EXISTS (SELECT 1 FROM public.booking_vouchers v WHERE v.booking_id = b.id) AS m_vou,
      NOT EXISTS (SELECT 1 FROM public.booking_financial_snapshots s WHERE s.booking_id = b.id) AS m_snap,
      NOT EXISTS (SELECT 1 FROM public.booking_automation_runs r WHERE r.booking_id = b.id) AS m_run,
      NOT EXISTS (SELECT 1 FROM public.booking_timeline_events t WHERE t.booking_id = b.id) AS m_tl,
      NOT EXISTS (SELECT 1 FROM public.booking_status_history h WHERE h.booking_id = b.id) AS m_hist,
      NOT EXISTS (SELECT 1 FROM public.domain_events e WHERE e.aggregate_id = b.id) AS m_evt,
      EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.booking_id = b.id
          AND NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.reference_type = 'invoice' AND j.reference_id = i.id)
      ) AS m_gl,
      (b.customer_id IS NULL) AS no_cust,
      (b.supplier_id IS NULL) AS no_sup,
      (COALESCE(b.selling_price,0) = 0) AS zero_p,
      (COALESCE(b.selling_price,0) < COALESCE(b.cost_price,0)) AS neg_m
    FROM b
  )
  SELECT id, booking_number, created_on, stage, customer_id, supplier_id, selling_price, cost_price, currency,
    m_inv, m_po, m_vou, m_snap, m_run, m_tl, m_hist, m_evt, m_gl, no_cust, no_sup, zero_p, neg_m,
    (m_inv::int + m_po::int + m_vou::int + m_snap::int + m_run::int + m_tl::int + m_hist::int + m_evt::int + m_gl::int)
  FROM f
  ORDER BY created_on DESC;
$$;

CREATE OR REPLACE FUNCTION public.audit_historical_summary(_org uuid, _from date DEFAULT '2022-05-22', _to date DEFAULT CURRENT_DATE, _log boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_res jsonb; v_run uuid;
BEGIN
  IF NOT (_org = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized for organization';
  END IF;

  SELECT jsonb_build_object(
    'organization_id', _org, 'from_date', _from, 'to_date', _to,
    'total_bookings', COUNT(*),
    'clean_bookings', COUNT(*) FILTER (WHERE gap_count = 0),
    'bookings_with_gaps', COUNT(*) FILTER (WHERE gap_count > 0),
    'missing_invoice', COUNT(*) FILTER (WHERE missing_invoice),
    'missing_supplier_po', COUNT(*) FILTER (WHERE missing_supplier_po),
    'missing_voucher', COUNT(*) FILTER (WHERE missing_voucher),
    'missing_snapshot', COUNT(*) FILTER (WHERE missing_snapshot),
    'missing_automation_run', COUNT(*) FILTER (WHERE missing_automation_run),
    'missing_timeline', COUNT(*) FILTER (WHERE missing_timeline),
    'missing_workflow_history', COUNT(*) FILTER (WHERE missing_workflow_history),
    'missing_events', COUNT(*) FILTER (WHERE missing_events),
    'missing_gl', COUNT(*) FILTER (WHERE missing_gl),
    'no_customer', COUNT(*) FILTER (WHERE no_customer),
    'no_supplier', COUNT(*) FILTER (WHERE no_supplier),
    'zero_price', COUNT(*) FILTER (WHERE zero_price),
    'negative_margin', COUNT(*) FILTER (WHERE negative_margin)
  ) INTO v_res FROM public.audit_historical_gaps(_org, _from, _to);

  v_res := v_res || jsonb_build_object(
    'orphan_customer_payments', (SELECT COUNT(*) FROM public.customer_payments cp
        WHERE cp.organization_id = _org AND cp.payment_date BETWEEN _from AND _to
          AND cp.booking_id IS NULL AND cp.invoice_id IS NULL),
    'supplier_payments_without_booking', (SELECT COUNT(*) FROM public.supplier_payments sp
        WHERE sp.organization_id = _org AND sp.payment_date BETWEEN _from AND _to AND sp.booking_id IS NULL),
    'invoices_without_gl', (SELECT COUNT(*) FROM public.invoices i
        WHERE i.organization_id = _org AND i.created_at::date BETWEEN _from AND _to
          AND NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.reference_type='invoice' AND j.reference_id=i.id)),
    'unbalanced_journal_entries', (SELECT COUNT(*) FROM public.journal_entries j
        WHERE j.organization_id = _org AND j.entry_date BETWEEN _from AND _to
          AND ROUND(COALESCE(j.total_debit,0),2) <> ROUND(COALESCE(j.total_credit,0),2)),
    'failed_event_deliveries', (SELECT COUNT(*) FROM public.event_deliveries d
        JOIN public.domain_events e ON e.id = d.event_id
        WHERE e.organization_id = _org AND d.status = 'failed')
  );

  IF _log AND public._recovery_can_manage(_org) THEN
    INSERT INTO public.historical_recovery_runs (organization_id, mode, from_date, to_date, status, totals, started_by, finished_at)
    VALUES (_org, 'audit', _from, _to, 'completed', v_res, auth.uid(), now())
    RETURNING id INTO v_run;
    v_res := v_res || jsonb_build_object('run_id', v_run);
  END IF;

  RETURN v_res;
END;
$$;

-- ============ PHASE 2: IDEMPOTENT BACKFILL ============
CREATE OR REPLACE FUNCTION public.backfill_historical_bookings(
  _org uuid, _from date DEFAULT '2022-05-22', _to date DEFAULT CURRENT_DATE,
  _dry_run boolean DEFAULT true, _limit int DEFAULT 500
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run uuid; r RECORD;
  v_processed int := 0; v_created int := 0; v_skipped int := 0; v_failed int := 0; v_sim int := 0;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN RAISE EXCEPTION 'not authorized to run recovery'; END IF;

  INSERT INTO public.historical_recovery_runs (organization_id, mode, from_date, to_date, status, started_by)
  VALUES (_org, CASE WHEN _dry_run THEN 'simulate' ELSE 'execute' END, _from, _to, 'running', auth.uid())
  RETURNING id INTO v_run;

  FOR r IN SELECT * FROM public.audit_historical_gaps(_org, _from, _to) LIMIT _limit LOOP
    v_processed := v_processed + 1;

    IF r.gap_count = 0 THEN
      v_skipped := v_skipped + 1;
      INSERT INTO public.historical_recovery_items (run_id, organization_id, booking_id, booking_number, entity_type, action, detail)
      VALUES (v_run, _org, r.booking_id, r.booking_number, 'booking', 'verified', 'no gaps detected');
      CONTINUE;
    END IF;

    IF _dry_run THEN
      v_sim := v_sim + 1;
      INSERT INTO public.historical_recovery_items (run_id, organization_id, booking_id, booking_number, entity_type, action, detail)
      SELECT v_run, _org, r.booking_id, r.booking_number, e, 'would_create', 'missing artifact detected'
      FROM unnest(ARRAY[
        CASE WHEN r.missing_invoice AND COALESCE(r.selling_price,0) > 0 THEN 'invoice' END,
        CASE WHEN r.missing_supplier_po THEN 'supplier_po' END,
        CASE WHEN r.missing_voucher THEN 'voucher' END,
        CASE WHEN r.missing_snapshot THEN 'financial_snapshot' END,
        CASE WHEN r.missing_automation_run THEN 'automation_run' END,
        CASE WHEN r.missing_timeline THEN 'timeline' END,
        CASE WHEN r.missing_gl THEN 'gl_posting' END
      ]) AS e WHERE e IS NOT NULL;

      IF COALESCE(r.selling_price,0) = 0 OR r.no_customer THEN
        INSERT INTO public.historical_recovery_items (run_id, organization_id, booking_id, booking_number, entity_type, action, detail)
        VALUES (v_run, _org, r.booking_id, r.booking_number, 'booking', 'skipped',
                CASE WHEN r.no_customer THEN 'no customer linked; ' ELSE '' END ||
                CASE WHEN COALESCE(r.selling_price,0) = 0 THEN 'selling price is zero' ELSE '' END);
      END IF;
      CONTINUE;
    END IF;

    BEGIN
      PERFORM public.run_booking_automation(r.booking_id);
      v_created := v_created + 1;
      INSERT INTO public.historical_recovery_items (run_id, organization_id, booking_id, booking_number, entity_type, action, detail)
      VALUES (v_run, _org, r.booking_id, r.booking_number, 'booking', 'created',
              'automation replayed idempotently (gaps: '||r.gap_count||')');

      IF NOT EXISTS (SELECT 1 FROM public.booking_timeline_events t WHERE t.booking_id = r.booking_id AND t.kind = 'historical_recovery') THEN
        INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, actor_label, summary, payload)
        VALUES (_org, r.booking_id, 'historical_recovery', auth.uid(), 'Historical Recovery',
                'Historical backfill executed', jsonb_build_object('run_id', v_run, 'gaps', r.gap_count));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      INSERT INTO public.historical_recovery_items (run_id, organization_id, booking_id, booking_number, entity_type, action, error_message)
      VALUES (v_run, _org, r.booking_id, r.booking_number, 'booking', 'failed', SQLERRM);
    END;
  END LOOP;

  UPDATE public.historical_recovery_runs
  SET status = 'completed', finished_at = now(),
      totals = jsonb_build_object('processed', v_processed, 'created', v_created, 'simulated', v_sim,
                                  'skipped', v_skipped, 'failed', v_failed, 'dry_run', _dry_run)
  WHERE id = v_run;

  RETURN jsonb_build_object('run_id', v_run, 'dry_run', _dry_run, 'processed', v_processed,
                            'created', v_created, 'simulated', v_sim, 'skipped', v_skipped, 'failed', v_failed);
END;
$$;

-- ============ PHASE 3: GL REPLAY ============
CREATE OR REPLACE FUNCTION public.replay_gl_postings(_org uuid, _from date DEFAULT '2022-05-22', _to date DEFAULT CURRENT_DATE, _dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_run uuid; v_res jsonb; v_row RECORD; v_pending int;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN RAISE EXCEPTION 'not authorized to replay ledger'; END IF;

  SELECT COUNT(*) INTO v_pending FROM public.invoices i
   WHERE i.organization_id = _org AND i.created_at::date BETWEEN _from AND _to
     AND NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.reference_type='invoice' AND j.reference_id=i.id);

  IF _dry_run THEN
    RETURN jsonb_build_object('dry_run', true, 'invoices_pending_posting', v_pending);
  END IF;

  INSERT INTO public.historical_recovery_runs (organization_id, mode, from_date, to_date, status, started_by)
  VALUES (_org, 'gl_replay', _from, _to, 'running', auth.uid()) RETURNING id INTO v_run;

  SELECT * INTO v_row FROM public.backfill_journals(_org);
  v_res := jsonb_build_object(
    'invoices_posted', v_row.invoices_posted, 'supplier_payments_posted', v_row.supplier_payments_posted,
    'expenses_posted', v_row.expenses_posted, 'customer_payments_posted', v_row.customer_payments_posted,
    'invoices_pending_before', v_pending);

  UPDATE public.historical_recovery_runs SET status='completed', finished_at=now(), totals=v_res WHERE id=v_run;
  RETURN v_res || jsonb_build_object('run_id', v_run, 'dry_run', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.fiscal_year_reconciliation(_org uuid, _year int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date; v_end date; v_audit jsonb; v_gl jsonb; v_ops jsonb; v_res jsonb;
BEGIN
  IF NOT (_org = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized for organization';
  END IF;

  v_start := GREATEST(make_date(_year,1,1), DATE '2022-05-22');
  v_end := LEAST(make_date(_year,12,31), CURRENT_DATE);
  IF v_start > v_end THEN RAISE EXCEPTION 'fiscal year % is outside the recovery window', _year; END IF;

  v_audit := public.audit_historical_summary(_org, v_start, v_end, false);

  SELECT jsonb_build_object(
    'total_debit', COALESCE(SUM(total_debit),0),
    'total_credit', COALESCE(SUM(total_credit),0),
    'difference', ROUND(COALESCE(SUM(total_debit),0) - COALESCE(SUM(total_credit),0), 2),
    'entries', COUNT(*)
  ) INTO v_gl FROM public.journal_entries
   WHERE organization_id = _org AND entry_date BETWEEN v_start AND v_end;

  SELECT jsonb_build_object(
    'booking_revenue', COALESCE(SUM(selling_price),0),
    'booking_cost', COALESCE(SUM(cost_price),0),
    'booking_profit', COALESCE(SUM(COALESCE(selling_price,0)-COALESCE(cost_price,0)),0),
    'invoiced_total', (SELECT COALESCE(SUM(final_amount),0) FROM public.invoices
        WHERE organization_id=_org AND created_at::date BETWEEN v_start AND v_end),
    'customer_payments_total', (SELECT COALESCE(SUM(amount),0) FROM public.customer_payments
        WHERE organization_id=_org AND payment_date BETWEEN v_start AND v_end),
    'supplier_payments_total', (SELECT COALESCE(SUM(amount),0) FROM public.supplier_payments
        WHERE organization_id=_org AND payment_date BETWEEN v_start AND v_end)
  ) INTO v_ops FROM public.bookings
   WHERE organization_id = _org AND created_at::date BETWEEN v_start AND v_end;

  v_res := jsonb_build_object('fiscal_year', _year, 'period_start', v_start, 'period_end', v_end,
                              'audit', v_audit, 'ledger', v_gl, 'operations', v_ops,
                              'ledger_balanced', (v_gl->>'difference')::numeric = 0,
                              'ready_to_close', ((v_gl->>'difference')::numeric = 0
                                                 AND (v_audit->>'bookings_with_gaps')::int = 0),
                              'generated_at', now());

  IF public._recovery_can_manage(_org) THEN
    INSERT INTO public.fiscal_year_closures (organization_id, fiscal_year, period_start, period_end, status, reconciliation, reconciled_at)
    VALUES (_org, _year, v_start, v_end, 'reconciled', v_res, now())
    ON CONFLICT (organization_id, fiscal_year) DO UPDATE
      SET reconciliation = EXCLUDED.reconciliation, reconciled_at = now(),
          status = CASE WHEN public.fiscal_year_closures.status = 'closed' THEN 'closed' ELSE 'reconciled' END,
          period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end;
  END IF;

  RETURN v_res;
END;
$$;

-- ============ FISCAL YEAR CLOSING (explicit confirmation only) ============
CREATE OR REPLACE FUNCTION public.close_fiscal_year(_org uuid, _year int, _confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.fiscal_year_closures; v_periods int := 0;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN RAISE EXCEPTION 'not authorized to close fiscal year'; END IF;
  IF _confirmation IS DISTINCT FROM ('CLOSE ' || _year::text) THEN
    RAISE EXCEPTION 'explicit confirmation required: type CLOSE %', _year;
  END IF;

  SELECT * INTO v_row FROM public.fiscal_year_closures WHERE organization_id=_org AND fiscal_year=_year;
  IF NOT FOUND THEN RAISE EXCEPTION 'run the reconciliation report for % before closing', _year; END IF;
  IF v_row.status = 'closed' THEN RETURN jsonb_build_object('already_closed', true, 'fiscal_year', _year); END IF;
  IF v_row.reconciled_at IS NULL OR v_row.reconciled_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'reconciliation report is missing or stale; re-run it before closing';
  END IF;

  UPDATE public.accounting_periods
     SET status = 'closed', closed_by = auth.uid(), closed_at = now()
   WHERE organization_id = _org AND status <> 'closed'
     AND start_date >= v_row.period_start AND end_date <= v_row.period_end;
  GET DIAGNOSTICS v_periods = ROW_COUNT;

  UPDATE public.fiscal_year_closures
     SET status='closed', closed_by=auth.uid(), closed_at=now(), confirmed_by=auth.uid(), confirmed_at=now(),
         reopened_at=NULL, reopened_by=NULL, reopen_reason=NULL
   WHERE id = v_row.id;

  RETURN jsonb_build_object('fiscal_year', _year, 'status', 'closed', 'periods_closed', v_periods, 'closed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(_org uuid, _year int, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.fiscal_year_closures; v_periods int := 0;
BEGIN
  IF NOT public._recovery_can_manage(_org) THEN RAISE EXCEPTION 'not authorized to reopen fiscal year'; END IF;
  IF COALESCE(btrim(_reason),'') = '' THEN RAISE EXCEPTION 'a reason is required to reopen a fiscal year'; END IF;

  SELECT * INTO v_row FROM public.fiscal_year_closures WHERE organization_id=_org AND fiscal_year=_year;
  IF NOT FOUND OR v_row.status <> 'closed' THEN RAISE EXCEPTION 'fiscal year % is not closed', _year; END IF;

  UPDATE public.accounting_periods SET status='open', closed_by=NULL, closed_at=NULL
   WHERE organization_id=_org AND status='closed'
     AND start_date >= v_row.period_start AND end_date <= v_row.period_end;
  GET DIAGNOSTICS v_periods = ROW_COUNT;

  UPDATE public.fiscal_year_closures
     SET status='reconciled', reopened_by=auth.uid(), reopened_at=now(), reopen_reason=_reason,
         closed_by=NULL, closed_at=NULL
   WHERE id = v_row.id;

  RETURN jsonb_build_object('fiscal_year', _year, 'status', 'reopened', 'periods_reopened', v_periods);
END;
$$;

-- ============ GRANTS ============
REVOKE ALL ON FUNCTION public._recovery_can_manage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_historical_gaps(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_historical_summary(uuid, date, date, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.backfill_historical_bookings(uuid, date, date, boolean, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.replay_gl_postings(uuid, date, date, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fiscal_year_reconciliation(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_fiscal_year(uuid, int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_fiscal_year(uuid, int, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public._recovery_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_historical_gaps(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_historical_summary(uuid, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_historical_bookings(uuid, date, date, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replay_gl_postings(uuid, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_year_reconciliation(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, int, text) TO authenticated;
