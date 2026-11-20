-- Subscription term controls are installed separately by 20261120020358.
-- This additive read RPC belongs to the Paymob checkout release.
CREATE OR REPLACE FUNCTION public.get_subscription_checkout_status(p_checkout_id uuid)
RETURNS TABLE (status text, amount_cents bigint, currency text, transaction_id text, activated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN checkout.status IN ('voided', 'refunded') THEN checkout.status
    WHEN receipt.subscription_activated_at IS NOT NULL
      AND checkout.status = 'paid'
      AND checkout.provider_transaction_id = receipt.paymob_transaction_id THEN 'confirmed'
    WHEN receipt.paymob_transaction_id IS NOT NULL THEN 'activating'
    WHEN checkout.status = 'failed' THEN 'failed'
    WHEN checkout.status = 'expired' OR checkout.expires_at <= now() THEN 'expired'
    ELSE 'pending'
  END,
  checkout.amount_cents, checkout.currency, receipt.paymob_transaction_id, receipt.subscription_activated_at
  FROM public.payment_checkout_sessions AS checkout
  LEFT JOIN LATERAL (
    SELECT tx.paymob_transaction_id, tx.subscription_activated_at
    FROM public.payment_transactions AS tx
    WHERE tx.checkout_session_id = checkout.id
      AND tx.organization_id = checkout.organization_id
      AND tx.plan_id = checkout.plan_id
      AND tx.billing_cycle = checkout.billing_cycle
      AND tx.paymob_order_id = checkout.paymob_order_id
      AND tx.amount_cents = checkout.amount_cents
      AND tx.expected_amount_cents = checkout.amount_cents
      AND tx.currency = checkout.currency
      AND tx.status = 'success'
      AND tx.hmac_valid IS TRUE
    ORDER BY (tx.paymob_transaction_id = checkout.provider_transaction_id) DESC NULLS LAST,
      tx.subscription_activated_at DESC NULLS LAST, tx.created_at DESC
    LIMIT 1
  ) AS receipt ON true
  WHERE checkout.id = p_checkout_id
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.organization_id = checkout.organization_id
        AND member.user_id = auth.uid()
        AND member.is_active
        AND member.role IN ('owner', 'manager')
    );
$$;

REVOKE ALL ON FUNCTION public.get_subscription_checkout_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_checkout_status(uuid) TO authenticated;
