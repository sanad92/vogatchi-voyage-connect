-- إنشاء جدول payment_intents لتتبع عمليات الدفع
CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES hotel_bookings(id),
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'egp',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  stripe_payment_method_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their payment intents" 
ON public.payment_intents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM hotel_bookings hb 
    WHERE hb.id = payment_intents.booking_id 
    AND hb.booking_agent_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = payment_intents.invoice_id 
    AND i.customer_id IN (
      SELECT id FROM customers WHERE created_by = auth.uid()
    )
  )
);

CREATE POLICY "Edge functions can manage payment intents" 
ON public.payment_intents 
FOR ALL 
USING (true);