-- A fully credited, unpaid invoice should be cancelled while both its
-- original posting and the posted cancellation credit remain in the ledger.
CREATE FUNCTION trip_amendment_private.is_fully_waived_invoice(i public.invoices)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT coalesce(i.final_amount > 0 AND i.total_paid_amount = 0 AND i.remaining_amount = 0, false)
    AND EXISTS (
      SELECT FROM public.booking_cancellation_invoice_credits c
      JOIN public.booking_cancellation_settlements s ON s.booking_id = c.booking_id
      JOIN public.journal_entries j ON j.source_id = c.id AND j.source_type = 'booking_cancellation_invoice_credit'
        AND j.organization_id = s.organization_id AND j.booking_id = s.booking_id
      WHERE c.invoice_id = i.id AND c.booking_id = i.booking_id AND s.organization_id = i.organization_id
        AND c.amount = i.final_amount AND j.status = 'posted' AND j.is_locked
        AND j.total_debit = c.amount AND j.total_credit = c.amount
        AND EXISTS (SELECT FROM jsonb_array_elements(s.result) r
          WHERE r->>'invoice_id' = i.id::text AND (r->>'fee')::numeric = 0 AND (r->>'refund')::numeric = 0)
    )
$$;

-- Keep the usual lock protection for all other invoice transitions.
CREATE FUNCTION trip_amendment_private.guard_invoice_cancellation_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF trip_amendment_private.is_fully_waived_invoice(OLD) THEN
    IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
    IF OLD.status = 'cancelled' THEN
      RAISE EXCEPTION 'الفاتورة ملغاة بتسوية معتمدة';
    END IF;
  END IF;
  IF NEW.status IN ('draft','cancelled') AND EXISTS (
    SELECT FROM public.journal_entries j WHERE j.organization_id = OLD.organization_id
      AND j.source_type = 'invoice' AND j.source_id = OLD.id AND j.is_locked
  ) THEN
    RAISE EXCEPTION 'The financial source is locked by a posted journal entry';
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_guard_locked_invoice_cancellation ON public.invoices;
CREATE TRIGGER trg_guard_locked_invoice_cancellation
BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION trip_amendment_private.guard_invoice_cancellation_status();

CREATE OR REPLACE FUNCTION trip_amendment_private.apply_invoice_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_credit numeric;
BEGIN
  v_credit := trip_amendment_private.invoice_credit(NEW.id);
  IF v_credit > 0 THEN
    IF coalesce(NEW.total_paid_amount, 0) + v_credit > NEW.final_amount THEN
      RAISE EXCEPTION 'مدفوعات الفاتورة وتسوياتها تتجاوز قيمتها';
    END IF;
    NEW.remaining_amount := NEW.final_amount - coalesce(NEW.total_paid_amount, 0) - v_credit;
    IF NEW.status = 'cancelled' AND trip_amendment_private.is_fully_waived_invoice(NEW) THEN
      NEW.payment_status := 'cancelled';
      RETURN NEW;
    END IF;
    NEW.payment_status := CASE WHEN NEW.remaining_amount = 0 THEN 'paid'
      WHEN coalesce(NEW.total_paid_amount, 0) > 0 THEN 'partial' ELSE 'unpaid' END;
    IF NEW.remaining_amount = 0 AND NEW.status NOT IN ('draft', 'cancelled') THEN
      NEW.status := 'paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION trip_amendment_private.cancel_fully_waived_invoices(_booking uuid)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE i public.invoices%ROWTYPE;
BEGIN
  FOR i IN SELECT x.* FROM public.invoices x
    JOIN public.booking_cancellation_invoice_credits c ON c.invoice_id = x.id
    WHERE c.booking_id = _booking AND x.status IS DISTINCT FROM 'cancelled'
      AND trip_amendment_private.is_fully_waived_invoice(x)
    ORDER BY x.id FOR UPDATE OF x
  LOOP
    -- The standard posting routine removes unlocked invoice postings when
    -- a document is cancelled. This posting has a locked offset, so retain it.
    UPDATE public.journal_entries j SET is_locked = true
    WHERE j.organization_id = i.organization_id AND j.booking_id = i.booking_id
      AND j.source_type = 'invoice' AND j.source_id = i.id AND j.status = 'posted';
    IF NOT FOUND THEN RAISE EXCEPTION 'قيد إصدار الفاتورة % غير موجود', i.invoice_number; END IF;
    UPDATE public.invoices SET status = 'cancelled', updated_at = now() WHERE id = i.id;
  END LOOP;
END
$$;

CREATE FUNCTION trip_amendment_private.finalize_waived_invoice_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM trip_amendment_private.cancel_fully_waived_invoices(NEW.booking_id);
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_finalize_waived_invoice_status
AFTER UPDATE OF result ON public.booking_cancellation_settlements
FOR EACH ROW WHEN (NEW.result IS DISTINCT FROM OLD.result)
EXECUTE FUNCTION trip_amendment_private.finalize_waived_invoice_status();

-- Bring already approved settlements in line with the same rule. Only
-- invoices with matching posted original and cancellation entries qualify.
DO $backfill$
DECLARE v_booking uuid;
BEGIN
  FOR v_booking IN SELECT DISTINCT c.booking_id
    FROM public.booking_cancellation_invoice_credits c JOIN public.invoices i ON i.id = c.invoice_id
    WHERE i.status IS DISTINCT FROM 'cancelled' AND trip_amendment_private.is_fully_waived_invoice(i)
      AND EXISTS (SELECT FROM public.journal_entries j WHERE j.organization_id = i.organization_id
        AND j.booking_id = i.booking_id AND j.source_id = i.id AND j.source_type = 'invoice' AND j.status = 'posted')
  LOOP
    PERFORM trip_amendment_private.cancel_fully_waived_invoices(v_booking);
  END LOOP;
END
$backfill$;

REVOKE ALL ON FUNCTION trip_amendment_private.is_fully_waived_invoice(public.invoices),
  trip_amendment_private.guard_invoice_cancellation_status(),
  trip_amendment_private.cancel_fully_waived_invoices(uuid),
  trip_amendment_private.finalize_waived_invoice_status()
FROM PUBLIC, anon, authenticated;
