-- Validation trigger: invoice.currency must match linked booking.currency
CREATE OR REPLACE FUNCTION public.validate_invoice_currency_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_currency text;
BEGIN
  IF NEW.booking_id IS NULL OR NEW.currency IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT currency INTO booking_currency
  FROM public.bookings
  WHERE id = NEW.booking_id;

  IF booking_currency IS NOT NULL AND booking_currency <> NEW.currency THEN
    RAISE EXCEPTION 'عملة الفاتورة (%) لا تطابق عملة الحجز المرتبط (%). يجب أن تكونا متطابقتين.',
      NEW.currency, booking_currency
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invoice_currency_match ON public.invoices;
CREATE TRIGGER trg_validate_invoice_currency_match
  BEFORE INSERT OR UPDATE OF currency, booking_id ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_currency_match();