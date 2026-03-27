
-- Create quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  quote_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  status text DEFAULT 'draft',
  travel_date date,
  return_date date,
  destination text,
  number_of_travelers integer DEFAULT 1,
  notes text,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  vat_rate numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  valid_until date,
  assigned_employee_id uuid REFERENCES public.employees(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  item_type text NOT NULL,
  description text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  cost_price numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  quantity integer DEFAULT 1,
  total_cost numeric DEFAULT 0,
  total_selling numeric DEFAULT 0,
  details jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add quote_id to existing booking tables
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);
ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);
ALTER TABLE public.car_rentals ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);
ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);

-- Indexes
CREATE INDEX idx_quotes_org ON public.quotes(organization_id);
CREATE INDEX idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS for quotes
CREATE POLICY "quotes_select" ON public.quotes FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- RLS for quote_items
CREATE POLICY "quote_items_select" ON public.quote_items FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quote_items_insert" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quote_items_update" ON public.quote_items FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "quote_items_delete" ON public.quote_items FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Generate quote number function
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.quotes;
  new_number := 'QT-' || to_char(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$;

-- Updated_at trigger for quotes
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
