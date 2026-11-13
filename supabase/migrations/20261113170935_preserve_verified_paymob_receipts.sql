CREATE FUNCTION public.preserve_verified_paymob_receipt()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Retain the settled receipt when the same transaction is delivered again.
  -- A verified refund or void may supersede the successful receipt once.
  IF OLD.subscription_activated_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'success'
    AND NEW.status IN ('refunded', 'voided')
    AND NEW.hmac_valid IS TRUE
    AND (NEW.checkout_session_id, NEW.organization_id, NEW.plan_id, NEW.billing_cycle,
         NEW.paymob_order_id, NEW.paymob_transaction_id, NEW.amount_cents,
         NEW.expected_amount_cents, NEW.currency)
        IS NOT DISTINCT FROM
        (OLD.checkout_session_id, OLD.organization_id, OLD.plan_id, OLD.billing_cycle,
         OLD.paymob_order_id, OLD.paymob_transaction_id, OLD.amount_cents,
         OLD.expected_amount_cents, OLD.currency) THEN
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preserve_verified_paymob_receipt() FROM PUBLIC, anon, authenticated;

-- Run after the existing enrichment trigger has resolved the checkout.
CREATE TRIGGER trg_preserve_verified_paymob_receipt
  BEFORE UPDATE OF status, hmac_valid, raw_payload, amount_cents, currency,
    checkout_session_id, paymob_order_id, paymob_transaction_id, organization_id,
    expected_amount_cents, plan_id, billing_cycle, error_message
  ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.preserve_verified_paymob_receipt();
