CREATE FUNCTION public.preserve_paid_paymob_checkout()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- A verified refund or void can supersede payment. Retries and late
  -- notifications from other attempts must leave the paid checkout intact.
  IF OLD.status = 'paid'
    AND (NEW.status NOT IN ('paid', 'refunded', 'voided')
      OR NEW.provider_transaction_id IS DISTINCT FROM OLD.provider_transaction_id) THEN
    NEW.status := OLD.status;
    NEW.provider_transaction_id := OLD.provider_transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preserve_paid_paymob_checkout
  BEFORE UPDATE OF status, provider_transaction_id ON public.payment_checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.preserve_paid_paymob_checkout();
