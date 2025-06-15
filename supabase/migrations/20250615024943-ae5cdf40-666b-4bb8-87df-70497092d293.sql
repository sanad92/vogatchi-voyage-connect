
-- إنشاء جدول عقود الموردين
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('service', 'supply', 'maintenance')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  payment_terms TEXT,
  terms_and_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إضافة الحقول المطلوبة لجدول supplier_payments
ALTER TABLE public.supplier_payments 
ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS amount_in_egp NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.supplier_contracts(id);

-- تحديث الحقول الموجودة إذا لزم الأمر
UPDATE public.supplier_payments 
SET payment_date = COALESCE(paid_date, CURRENT_DATE)
WHERE payment_date IS NULL;

UPDATE public.supplier_payments 
SET reference_number = COALESCE(payment_reference, 'REF-' || id::text)
WHERE reference_number IS NULL;

-- إضافة الحقول المطلوبة لجدول suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'EGP',
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;

-- إنشاء جدول تقييمات الموردين
CREATE TABLE IF NOT EXISTS public.supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  delivery_time INTEGER CHECK (delivery_time >= 1 AND delivery_time <= 5),
  price_competitiveness INTEGER CHECK (price_competitiveness >= 1 AND price_competitiveness <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  overall_rating NUMERIC DEFAULT 0,
  feedback TEXT,
  rated_by UUID REFERENCES public.profiles(id),
  rating_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء مؤشر على supplier_id للأداء
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON public.supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON public.supplier_ratings(supplier_id);

-- تفعيل RLS للجداول الجديدة
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS أساسية
CREATE POLICY "Enable read access for all users" ON public.supplier_contracts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.supplier_contracts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update for authenticated users" ON public.supplier_contracts FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable read access for all users" ON public.supplier_ratings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.supplier_ratings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update for authenticated users" ON public.supplier_ratings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- إضافة triggers لحساب التقييم الإجمالي
CREATE OR REPLACE FUNCTION calculate_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_rating = (
    COALESCE(NEW.service_quality, 0) + 
    COALESCE(NEW.delivery_time, 0) + 
    COALESCE(NEW.price_competitiveness, 0) + 
    COALESCE(NEW.communication, 0)
  ) / 4.0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_supplier_rating_trigger
  BEFORE INSERT OR UPDATE ON public.supplier_ratings
  FOR EACH ROW EXECUTE FUNCTION calculate_overall_rating();
