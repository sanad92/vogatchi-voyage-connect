
-- إنشاء جدول مدفوعات الفواتير
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_amount NUMERIC NOT NULL CHECK (payment_amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة أعمدة جديدة لجدول الفواتير
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS total_paid_amount NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- تحديث القيم الموجودة
UPDATE public.invoices 
SET 
  total_paid_amount = CASE WHEN status = 'paid' THEN final_amount ELSE 0.00 END,
  remaining_amount = CASE WHEN status = 'paid' THEN 0.00 ELSE final_amount END,
  payment_status = CASE 
    WHEN status = 'paid' THEN 'fully_paid'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'unpaid'
  END;

-- إنشاء دالة لتحديث حالة الدفع للفاتورة
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_total NUMERIC;
  total_payments NUMERIC;
  new_status TEXT;
BEGIN
  -- جلب المجموع النهائي للفاتورة
  SELECT final_amount INTO invoice_total
  FROM public.invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- حساب مجموع المدفوعات
  SELECT COALESCE(SUM(payment_amount), 0) INTO total_payments
  FROM public.invoice_payments
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- تحديد الحالة الجديدة
  IF total_payments = 0 THEN
    new_status := 'unpaid';
  ELSIF total_payments >= invoice_total THEN
    new_status := 'fully_paid';
  ELSE
    new_status := 'partially_paid';
  END IF;
  
  -- تحديث الفاتورة
  UPDATE public.invoices
  SET 
    total_paid_amount = total_payments,
    remaining_amount = invoice_total - total_payments,
    payment_status = new_status,
    status = CASE 
      WHEN new_status = 'fully_paid' THEN 'paid'
      WHEN new_status = 'unpaid' THEN 'sent'
      ELSE status
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- إنشاء المشغلات
CREATE TRIGGER update_invoice_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_payment_status();

-- تفعيل RLS للجدول الجديد
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view invoice payments" ON public.invoice_payments
  FOR SELECT USING (true);

CREATE POLICY "Users can create invoice payments" ON public.invoice_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update invoice payments" ON public.invoice_payments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete invoice payments" ON public.invoice_payments
  FOR DELETE USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_payment_date ON public.invoice_payments(payment_date);
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);
