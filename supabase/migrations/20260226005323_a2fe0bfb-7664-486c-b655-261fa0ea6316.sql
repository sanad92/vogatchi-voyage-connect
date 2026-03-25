
-- Create payment_transactions table to log all Paymob webhook events
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  paymob_order_id TEXT,
  paymob_transaction_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  card_last_four TEXT,
  card_brand TEXT,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  error_message TEXT,
  raw_payload JSONB,
  hmac_valid BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view their org's transactions
CREATE POLICY "Org members can view payment transactions"
ON public.payment_transactions
FOR SELECT
USING (organization_id IN (SELECT unnest(public.get_user_org_ids(auth.uid()))));

-- RLS: service role insert (webhook uses service role)
CREATE POLICY "Service role can insert payment transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_payment_transactions_org ON public.payment_transactions(organization_id);
CREATE INDEX idx_payment_transactions_paymob_order ON public.payment_transactions(paymob_order_id);

-- Timestamp trigger
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
