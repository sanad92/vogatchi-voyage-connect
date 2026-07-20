
-- ============ TABLES ============
CREATE TABLE public.booking_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  completion_score int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_automation_runs TO authenticated;
GRANT ALL ON public.booking_automation_runs TO service_role;
ALTER TABLE public.booking_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_runs_read" ON public.booking_automation_runs FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "auto_runs_write" ON public.booking_automation_runs FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

CREATE TABLE public.booking_automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.booking_automation_runs(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL,
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_automation_steps TO authenticated;
GRANT ALL ON public.booking_automation_steps TO service_role;
ALTER TABLE public.booking_automation_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_steps_read" ON public.booking_automation_steps FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "auto_steps_write" ON public.booking_automation_steps FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE INDEX idx_auto_steps_run ON public.booking_automation_steps(run_id);
CREATE INDEX idx_auto_steps_booking ON public.booking_automation_steps(booking_id);

CREATE TABLE public.supplier_payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  reference_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  source_type text,
  source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, source_type, source_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payment_orders TO authenticated;
GRANT ALL ON public.supplier_payment_orders TO service_role;
ALTER TABLE public.supplier_payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spo_read" ON public.supplier_payment_orders FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "spo_write" ON public.supplier_payment_orders FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE INDEX idx_spo_booking ON public.supplier_payment_orders(booking_id);
CREATE INDEX idx_spo_supplier ON public.supplier_payment_orders(supplier_id);

CREATE TABLE public.booking_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  voucher_number text NOT NULL UNIQUE,
  qr_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_vouchers TO authenticated;
GRANT ALL ON public.booking_vouchers TO service_role;
ALTER TABLE public.booking_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vch_read" ON public.booking_vouchers FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "vch_write" ON public.booking_vouchers FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

CREATE TABLE public.booking_financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  receivable_amount numeric NOT NULL DEFAULT 0,
  payable_amount numeric NOT NULL DEFAULT 0,
  expected_profit numeric NOT NULL DEFAULT 0,
  expected_margin_pct numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_financial_snapshots TO authenticated;
GRANT ALL ON public.booking_financial_snapshots TO service_role;
ALTER TABLE public.booking_financial_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bfs_read" ON public.booking_financial_snapshots FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "bfs_write" ON public.booking_financial_snapshots FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

CREATE TABLE public.messaging_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel text NOT NULL,
  template_key text NOT NULL,
  template_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, channel, template_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messaging_suggestions TO authenticated;
GRANT ALL ON public.messaging_suggestions TO service_role;
ALTER TABLE public.messaging_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_sug_read" ON public.messaging_suggestions FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "msg_sug_write" ON public.messaging_suggestions FOR ALL TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

CREATE TRIGGER trg_auto_runs_updated BEFORE UPDATE ON public.booking_automation_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_auto_steps_updated BEFORE UPDATE ON public.booking_automation_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_spo_updated BEFORE UPDATE ON public.supplier_payment_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_vch_updated BEFORE UPDATE ON public.booking_vouchers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bfs_updated BEFORE UPDATE ON public.booking_financial_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_msg_sug_updated BEFORE UPDATE ON public.messaging_suggestions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CORE RPC ============
CREATE OR REPLACE FUNCTION public.run_booking_automation(p_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_bk RECORD;
  v_invoice_id uuid;
  v_voucher_id uuid;
  v_po_id uuid;
  v_completed int := 0;
  v_total int := 0;
  v_receivable numeric := 0;
  v_payable numeric := 0;
  v_expected_profit numeric := 0;
  v_margin numeric := 0;
  v_currency text;
  v_inv_number text;
  v_voucher_number text;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking not found: %', p_booking_id; END IF;
  v_currency := COALESCE(v_bk.currency, 'EGP');

  INSERT INTO public.booking_automation_runs (booking_id, organization_id, status, last_run_at)
  VALUES (p_booking_id, v_bk.organization_id, 'pending', now())
  ON CONFLICT (booking_id) DO UPDATE SET last_run_at = now(), status = 'pending', error_message = NULL
  RETURNING id INTO v_run_id;

  -- STEP: invoice
  v_total := v_total + 1;
  BEGIN
    SELECT id INTO v_invoice_id FROM public.invoices WHERE booking_id = p_booking_id LIMIT 1;
    IF v_invoice_id IS NULL AND COALESCE(v_bk.selling_price,0) > 0 THEN
      BEGIN v_inv_number := public.generate_invoice_number(); EXCEPTION WHEN OTHERS THEN v_inv_number := 'INV-'||to_char(now(),'YYYYMMDDHH24MISS'); END;
      INSERT INTO public.invoices (
        organization_id, booking_id, booking_type, customer_id, customer_name, invoice_number,
        currency, subtotal, vat_rate, vat_amount, discount_amount, final_amount,
        total_paid_amount, remaining_amount, status, payment_status, issued_date, notes
      ) VALUES (
        v_bk.organization_id, p_booking_id, COALESCE(v_bk.booking_type,'general'), v_bk.customer_id, v_bk.customer_name, v_inv_number,
        v_currency, v_bk.selling_price, 0, 0, 0, v_bk.selling_price,
        0, v_bk.selling_price, 'unpaid', 'unpaid', CURRENT_DATE,
        'Auto-generated for booking '||COALESCE(v_bk.booking_number, p_booking_id::text)
      ) RETURNING id INTO v_invoice_id;
    END IF;
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, entity_type, entity_id, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'invoice', 'invoices', v_invoice_id,
            CASE WHEN v_invoice_id IS NOT NULL THEN 'completed' ELSE 'skipped' END,
            'invoice:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE
      SET status = EXCLUDED.status, entity_id = COALESCE(EXCLUDED.entity_id, public.booking_automation_steps.entity_id),
          attempts = public.booking_automation_steps.attempts + 1, last_attempt_at = now(), error_message = NULL, run_id = v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'invoice', 'failed', 'invoice:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  -- STEP: supplier PO
  v_total := v_total + 1;
  BEGIN
    IF v_bk.supplier_id IS NOT NULL AND COALESCE(v_bk.cost_price,0) > 0 THEN
      INSERT INTO public.supplier_payment_orders (organization_id, booking_id, supplier_id, service_type, reference_number, amount, currency, due_date, status, source_type, source_id, notes)
      VALUES (v_bk.organization_id, p_booking_id, v_bk.supplier_id, COALESCE(v_bk.booking_type,'other'),
              'PO-'||COALESCE(v_bk.booking_number, substr(p_booking_id::text,1,8)),
              v_bk.cost_price, v_currency, v_bk.start_date, 'draft', 'bookings', p_booking_id,
              'Auto-generated payment order')
      ON CONFLICT (booking_id, source_type, source_id) DO UPDATE
        SET amount = EXCLUDED.amount, supplier_id = EXCLUDED.supplier_id, service_type = EXCLUDED.service_type, currency = EXCLUDED.currency
      RETURNING id INTO v_po_id;
    END IF;
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, entity_type, entity_id, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'supplier_po', 'supplier_payment_orders', v_po_id,
            CASE WHEN v_po_id IS NOT NULL THEN 'completed' ELSE 'skipped' END,
            'supplier_po:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE
      SET status = EXCLUDED.status, entity_id = COALESCE(EXCLUDED.entity_id, public.booking_automation_steps.entity_id),
          attempts = public.booking_automation_steps.attempts + 1, last_attempt_at = now(), error_message = NULL, run_id = v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'supplier_po', 'failed', 'supplier_po:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  -- STEP: voucher
  v_total := v_total + 1;
  BEGIN
    SELECT id INTO v_voucher_id FROM public.booking_vouchers WHERE booking_id = p_booking_id;
    IF v_voucher_id IS NULL THEN
      v_voucher_number := 'V-'||COALESCE(v_bk.booking_number, substr(p_booking_id::text,1,8));
      INSERT INTO public.booking_vouchers (organization_id, booking_id, voucher_number, qr_payload)
      VALUES (v_bk.organization_id, p_booking_id, v_voucher_number,
              jsonb_build_object('booking_id', p_booking_id, 'booking_number', v_bk.booking_number,
                                 'customer', v_bk.customer_name, 'start_date', v_bk.start_date, 'end_date', v_bk.end_date))
      RETURNING id INTO v_voucher_id;
    END IF;
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, entity_type, entity_id, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'voucher', 'booking_vouchers', v_voucher_id, 'completed', 'voucher:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE
      SET status='completed', entity_id=EXCLUDED.entity_id, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), error_message=NULL, run_id=v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'voucher', 'failed', 'voucher:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  -- STEP: financial snapshot
  v_total := v_total + 1;
  BEGIN
    SELECT COALESCE(remaining_amount,0) INTO v_receivable FROM public.invoices WHERE booking_id = p_booking_id LIMIT 1;
    v_receivable := COALESCE(v_receivable, v_bk.selling_price, 0);
    SELECT COALESCE(SUM(amount),0) INTO v_payable FROM public.supplier_payment_orders WHERE booking_id = p_booking_id AND status IN ('draft','approved');
    v_expected_profit := COALESCE(v_bk.selling_price,0) - COALESCE(v_bk.cost_price,0);
    v_margin := CASE WHEN COALESCE(v_bk.selling_price,0) > 0 THEN (v_expected_profit / v_bk.selling_price) * 100 ELSE 0 END;

    INSERT INTO public.booking_financial_snapshots (organization_id, booking_id, receivable_amount, payable_amount, expected_profit, expected_margin_pct, currency)
    VALUES (v_bk.organization_id, p_booking_id, v_receivable, v_payable, v_expected_profit, v_margin, v_currency)
    ON CONFLICT (booking_id) DO UPDATE SET
      receivable_amount = EXCLUDED.receivable_amount, payable_amount = EXCLUDED.payable_amount,
      expected_profit = EXCLUDED.expected_profit, expected_margin_pct = EXCLUDED.expected_margin_pct,
      currency = EXCLUDED.currency, snapshot_at = now();

    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, entity_type, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'financial_snapshot', 'booking_financial_snapshots', 'completed', 'financial_snapshot:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='completed', attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), error_message=NULL, run_id=v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'financial_snapshot', 'failed', 'financial_snapshot:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  -- STEP: timeline events
  v_total := v_total + 1;
  BEGIN
    IF v_invoice_id IS NOT NULL THEN
      INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, summary, payload)
      SELECT v_bk.organization_id, p_booking_id, 'invoice_created', 'Invoice auto-generated', jsonb_build_object('invoice_id', v_invoice_id)
      WHERE NOT EXISTS (SELECT 1 FROM public.booking_timeline_events WHERE booking_id=p_booking_id AND kind='invoice_created' AND (payload->>'invoice_id') = v_invoice_id::text);
    END IF;
    IF v_po_id IS NOT NULL THEN
      INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, summary, payload)
      SELECT v_bk.organization_id, p_booking_id, 'supplier_po_created', 'Supplier payment order auto-generated', jsonb_build_object('po_id', v_po_id)
      WHERE NOT EXISTS (SELECT 1 FROM public.booking_timeline_events WHERE booking_id=p_booking_id AND kind='supplier_po_created' AND (payload->>'po_id') = v_po_id::text);
    END IF;
    IF v_voucher_id IS NOT NULL THEN
      INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, summary, payload)
      SELECT v_bk.organization_id, p_booking_id, 'voucher_issued', 'Voucher auto-generated', jsonb_build_object('voucher_id', v_voucher_id)
      WHERE NOT EXISTS (SELECT 1 FROM public.booking_timeline_events WHERE booking_id=p_booking_id AND kind='voucher_issued' AND (payload->>'voucher_id') = v_voucher_id::text);
    END IF;
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'timeline', 'completed', 'timeline:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='completed', attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), error_message=NULL, run_id=v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'timeline', 'failed', 'timeline:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  -- STEP: messaging suggestions
  v_total := v_total + 1;
  BEGIN
    INSERT INTO public.messaging_suggestions (organization_id, booking_id, channel, template_key, template_variables, status)
    VALUES (v_bk.organization_id, p_booking_id, 'whatsapp', 'booking_confirmation',
            jsonb_build_object('customer_name', v_bk.customer_name, 'booking_number', v_bk.booking_number, 'start_date', v_bk.start_date), 'suggested')
    ON CONFLICT (booking_id, channel, template_key) DO NOTHING;

    INSERT INTO public.messaging_suggestions (organization_id, booking_id, channel, template_key, template_variables, status)
    VALUES (v_bk.organization_id, p_booking_id, 'email', 'booking_confirmation',
            jsonb_build_object('customer_name', v_bk.customer_name, 'booking_number', v_bk.booking_number), 'suggested')
    ON CONFLICT (booking_id, channel, template_key) DO NOTHING;

    IF v_receivable > 0 THEN
      INSERT INTO public.messaging_suggestions (organization_id, booking_id, channel, template_key, template_variables, status)
      VALUES (v_bk.organization_id, p_booking_id, 'whatsapp', 'payment_reminder',
              jsonb_build_object('customer_name', v_bk.customer_name, 'amount', v_receivable, 'currency', v_currency), 'suggested')
      ON CONFLICT (booking_id, channel, template_key) DO NOTHING;
    END IF;

    IF v_voucher_id IS NOT NULL THEN
      INSERT INTO public.messaging_suggestions (organization_id, booking_id, channel, template_key, template_variables, status)
      VALUES (v_bk.organization_id, p_booking_id, 'email', 'voucher_ready',
              jsonb_build_object('customer_name', v_bk.customer_name, 'voucher_number', 'V-'||COALESCE(v_bk.booking_number,'')), 'suggested')
      ON CONFLICT (booking_id, channel, template_key) DO NOTHING;
    END IF;

    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'messaging_suggestions', 'completed', 'messaging_suggestions:'||p_booking_id::text, 1, now())
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='completed', attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), error_message=NULL, run_id=v_run_id;
    v_completed := v_completed + 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_automation_steps (run_id, booking_id, organization_id, step_key, status, idempotency_key, attempts, last_attempt_at, error_message)
    VALUES (v_run_id, p_booking_id, v_bk.organization_id, 'messaging_suggestions', 'failed', 'messaging_suggestions:'||p_booking_id::text, 1, now(), SQLERRM)
    ON CONFLICT (booking_id, idempotency_key) DO UPDATE SET status='failed', error_message=SQLERRM, attempts=public.booking_automation_steps.attempts+1, last_attempt_at=now(), run_id=v_run_id;
  END;

  UPDATE public.booking_automation_runs
  SET completion_score = CASE WHEN v_total > 0 THEN LEAST(100, (v_completed * 100) / v_total) ELSE 0 END,
      status = CASE
        WHEN EXISTS (SELECT 1 FROM public.booking_automation_steps WHERE run_id = v_run_id AND status='failed') THEN 'partial'
        WHEN v_completed = v_total THEN 'completed'
        ELSE 'partial'
      END,
      last_run_at = now(),
      error_message = NULL
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_booking_automation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_booking_automation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.retry_booking_automation_step(p_step_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_booking uuid;
BEGIN
  SELECT booking_id INTO v_booking FROM public.booking_automation_steps WHERE id = p_step_id;
  IF v_booking IS NULL THEN RAISE EXCEPTION 'step not found'; END IF;
  RETURN public.run_booking_automation(v_booking);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retry_booking_automation_step(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_booking_automation_step(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_run_booking_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN PERFORM public.run_booking_automation(NEW.id); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_automation_insert ON public.bookings;
CREATE TRIGGER trg_bookings_automation_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_run_booking_automation();

DROP TRIGGER IF EXISTS trg_bookings_automation_stage ON public.bookings;
CREATE TRIGGER trg_bookings_automation_stage
AFTER UPDATE OF workflow_stage ON public.bookings
FOR EACH ROW WHEN (NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage)
EXECUTE FUNCTION public.trg_run_booking_automation();
