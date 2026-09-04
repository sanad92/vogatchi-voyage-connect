-- Keep booking supplier obligations, supplier invoices, payment allocations,
-- and payment status in one consistent AP chain.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_booking
  ON public.supplier_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_payment_order
  ON public.supplier_invoices(payment_order_id)
  WHERE payment_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_order
  ON public.supplier_payment_allocations(payment_order_id)
  WHERE payment_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_invoice
  ON public.supplier_payment_allocations(supplier_invoice_id)
  WHERE supplier_invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_supplier_invoice_from_payment_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice public.supplier_invoices%ROWTYPE;
BEGIN
  IF NEW.supplier_id IS NULL OR COALESCE(NEW.amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Serialise creation for the same order without forcing a destructive
  -- deduplication of any historical rows.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));

  SELECT * INTO v_invoice
  FROM public.supplier_invoices
  WHERE payment_order_id = NEW.id
  ORDER BY created_at, id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.supplier_invoices (
      organization_id, booking_id, supplier_id, payment_order_id,
      invoice_number, invoice_date, due_date, amount, currency,
      exchange_rate, amount_base, amount_paid, status, notes, created_by
    ) VALUES (
      NEW.organization_id, NEW.booking_id, NEW.supplier_id, NEW.id,
      'SINV-' || NEW.reference_number, COALESCE(NEW.created_at::date, CURRENT_DATE),
      NEW.due_date, NEW.amount, NEW.currency, 1, NEW.amount, 0,
      CASE WHEN NEW.approval_status = 'rejected' OR NEW.status = 'cancelled'
        THEN 'cancelled' ELSE 'unpaid' END,
      '[AUTO_FROM_PAYMENT_ORDER]', auth.uid()
    );
  ELSIF position('[AUTO_FROM_PAYMENT_ORDER]' IN COALESCE(v_invoice.notes, '')) = 1 THEN
    IF COALESCE(v_invoice.amount_paid, 0) > 0
       AND (v_invoice.amount <> NEW.amount OR v_invoice.currency <> NEW.currency) THEN
      RAISE EXCEPTION 'Cannot change a supplier order after payments were allocated';
    END IF;

    UPDATE public.supplier_invoices
    SET booking_id = NEW.booking_id,
        supplier_id = NEW.supplier_id,
        due_date = NEW.due_date,
        amount = NEW.amount,
        currency = NEW.currency,
        amount_base = NEW.amount * exchange_rate,
        status = CASE
          WHEN NEW.approval_status = 'rejected' OR NEW.status = 'cancelled' THEN 'cancelled'
          WHEN amount_paid >= NEW.amount AND NEW.amount > 0 THEN 'paid'
          WHEN amount_paid > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = now()
    WHERE id = v_invoice.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_supplier_invoice_from_payment_order() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_supplier_invoice_from_payment_order
  ON public.supplier_payment_orders;
CREATE TRIGGER trg_sync_supplier_invoice_from_payment_order
AFTER INSERT OR UPDATE OF amount, currency, due_date, supplier_id, booking_id,
  status, approval_status
ON public.supplier_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_invoice_from_payment_order();

CREATE OR REPLACE FUNCTION public.prepare_supplier_payment_allocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice public.supplier_invoices%ROWTYPE;
  v_payment public.supplier_payments%ROWTYPE;
  v_existing numeric;
  v_match_count integer;
BEGIN
  IF NEW.supplier_invoice_id IS NULL AND NEW.payment_order_id IS NOT NULL THEN
    SELECT COUNT(*), (array_agg(id ORDER BY id))[1]
      INTO v_match_count, NEW.supplier_invoice_id
    FROM public.supplier_invoices
    WHERE payment_order_id = NEW.payment_order_id
      AND status <> 'cancelled';

    IF v_match_count <> 1 THEN
      NEW.supplier_invoice_id := NULL;
    END IF;
  END IF;

  IF NEW.supplier_invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_invoice
  FROM public.supplier_invoices
  WHERE id = NEW.supplier_invoice_id
  FOR UPDATE;
  IF NOT FOUND OR v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Supplier invoice is missing or cancelled';
  END IF;

  SELECT * INTO v_payment
  FROM public.supplier_payments
  WHERE id = NEW.supplier_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier payment not found';
  END IF;

  IF v_invoice.organization_id <> NEW.organization_id
     OR v_payment.organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Supplier payment allocation crosses organizations';
  END IF;
  IF v_invoice.supplier_id IS DISTINCT FROM v_payment.supplier_id THEN
    RAISE EXCEPTION 'Supplier payment allocation uses another supplier';
  END IF;
  IF v_invoice.currency <> COALESCE(v_payment.currency, 'EGP') THEN
    RAISE EXCEPTION 'Supplier payment currency must match supplier invoice currency';
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_existing
  FROM public.supplier_payment_allocations a
  WHERE a.supplier_invoice_id = NEW.supplier_invoice_id
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id);

  IF v_existing + NEW.amount > v_invoice.amount + 0.01 THEN
    RAISE EXCEPTION 'Supplier payment exceeds the remaining supplier invoice balance';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_supplier_payment_allocation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prepare_supplier_payment_allocation
  ON public.supplier_payment_allocations;
CREATE TRIGGER trg_prepare_supplier_payment_allocation
BEFORE INSERT OR UPDATE OF supplier_payment_id, payment_order_id,
  supplier_invoice_id, amount, organization_id
ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.prepare_supplier_payment_allocation();

CREATE OR REPLACE FUNCTION public.refresh_supplier_invoice_payment_state(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_paid numeric;
BEGIN
  IF _invoice_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_paid
  FROM public.supplier_payment_allocations a
  JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
  WHERE a.supplier_invoice_id = _invoice_id
    AND p.status IN ('paid', 'completed');

  UPDATE public.supplier_invoices
  SET amount_paid = v_paid,
      status = CASE
        WHEN status = 'cancelled' THEN 'cancelled'
        WHEN v_paid >= amount AND amount > 0 THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = now()
  WHERE id = _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_supplier_invoice_payment_state(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_supplier_invoice_from_allocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_supplier_invoice_payment_state(OLD.supplier_invoice_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_supplier_invoice_payment_state(NEW.supplier_invoice_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_supplier_invoice_from_allocation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_supplier_invoice_from_allocation
  ON public.supplier_payment_allocations;
CREATE TRIGGER trg_refresh_supplier_invoice_from_allocation
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_invoice_from_allocation();

CREATE OR REPLACE FUNCTION public.refresh_supplier_invoices_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  FOR v_invoice_id IN
    SELECT DISTINCT a.supplier_invoice_id
    FROM public.supplier_payment_allocations a
    WHERE a.supplier_payment_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
      AND a.supplier_invoice_id IS NOT NULL
  LOOP
    PERFORM public.refresh_supplier_invoice_payment_state(v_invoice_id);
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_supplier_invoices_from_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_supplier_invoices_from_payment
  ON public.supplier_payments;
CREATE TRIGGER trg_refresh_supplier_invoices_from_payment
AFTER UPDATE OF status OR DELETE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_invoices_from_payment();

-- Backfill the missing supplier-invoice layer for existing payment orders.
INSERT INTO public.supplier_invoices (
  organization_id, booking_id, supplier_id, payment_order_id,
  invoice_number, invoice_date, due_date, amount, currency,
  exchange_rate, amount_base, amount_paid, status, notes
)
SELECT po.organization_id, po.booking_id, po.supplier_id, po.id,
       'SINV-' || po.reference_number, po.created_at::date, po.due_date,
       po.amount, po.currency, 1, po.amount, 0,
       CASE WHEN po.approval_status = 'rejected' OR po.status = 'cancelled'
         THEN 'cancelled' ELSE 'unpaid' END,
       '[AUTO_FROM_PAYMENT_ORDER] Backfilled payable'
FROM public.supplier_payment_orders po
WHERE po.supplier_id IS NOT NULL
  AND po.amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.supplier_invoices si
    WHERE si.payment_order_id = po.id
  );

-- Link historical payment allocations only where the order has one clear,
-- active supplier invoice. Ambiguous rows remain visible for manual review.
UPDATE public.supplier_payment_allocations a
SET supplier_invoice_id = matched.invoice_id
FROM (
  SELECT si.payment_order_id, (array_agg(si.id ORDER BY si.id))[1] AS invoice_id
  FROM public.supplier_invoices si
  WHERE si.payment_order_id IS NOT NULL AND si.status <> 'cancelled'
  GROUP BY si.payment_order_id
  HAVING COUNT(*) = 1
) matched
JOIN public.supplier_invoices si ON si.id = matched.invoice_id
JOIN public.supplier_payment_orders po ON po.id = matched.payment_order_id
WHERE a.payment_order_id = matched.payment_order_id
  AND a.supplier_invoice_id IS NULL
  AND si.organization_id = a.organization_id
  AND si.supplier_id IS NOT DISTINCT FROM po.supplier_id
  AND si.currency = po.currency
  AND EXISTS (
    SELECT 1
    FROM public.supplier_payments p
    WHERE p.id = a.supplier_payment_id
      AND p.organization_id = a.organization_id
      AND p.supplier_id IS NOT DISTINCT FROM si.supplier_id
      AND COALESCE(p.currency, 'EGP') = si.currency
  )
  AND (
    SELECT COALESCE(SUM(a2.amount), 0)
    FROM public.supplier_payment_allocations a2
    WHERE a2.payment_order_id = a.payment_order_id
  ) <= si.amount + 0.01;

WITH paid AS (
  SELECT a.supplier_invoice_id, COALESCE(SUM(a.amount), 0) AS amount_paid
  FROM public.supplier_payment_allocations a
  JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
  WHERE a.supplier_invoice_id IS NOT NULL
    AND p.status IN ('paid', 'completed')
  GROUP BY a.supplier_invoice_id
)
UPDATE public.supplier_invoices si
SET amount_paid = COALESCE(paid.amount_paid, 0),
    status = CASE
      WHEN si.status = 'cancelled' THEN 'cancelled'
      WHEN COALESCE(paid.amount_paid, 0) >= si.amount AND si.amount > 0 THEN 'paid'
      WHEN COALESCE(paid.amount_paid, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = now()
FROM paid
WHERE si.id = paid.supplier_invoice_id;

UPDATE public.supplier_invoices si
SET amount_paid = 0,
    status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE 'unpaid' END,
    updated_at = now()
WHERE status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1
    FROM public.supplier_payment_allocations a
    JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
    WHERE a.supplier_invoice_id = si.id
      AND p.status IN ('paid', 'completed')
  );

COMMIT;
