
-- إضافة حقول جديدة لجدول الموردين
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'deferred' CHECK (payment_type IN ('prepaid', 'deferred'));
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS payment_method_options JSONB DEFAULT '["bank_transfer"]'::jsonb;

-- تحديث التعليقات للحقول الجديدة
COMMENT ON COLUMN public.suppliers.payment_type IS 'نوع الدفع: prepaid (مسبق) أو deferred (آجل)';
COMMENT ON COLUMN public.suppliers.payment_method_options IS 'وسائل الدفع المتاحة مع المورد';

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_suppliers_payment_type ON public.suppliers(payment_type);
