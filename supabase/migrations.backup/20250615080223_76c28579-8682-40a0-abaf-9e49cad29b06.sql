
-- إنشاء جدول العملات المدعومة للموردين
CREATE TABLE public.supplier_currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  exchange_rate NUMERIC(15,6) DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, currency)
);

-- إضافة فهرس لتحسين الأداء
CREATE INDEX idx_supplier_currencies_supplier_id ON public.supplier_currencies(supplier_id);
CREATE INDEX idx_supplier_currencies_currency ON public.supplier_currencies(currency);

-- إضافة RLS للأمان
ALTER TABLE public.supplier_currencies ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة - السماح لجميع المستخدمين المصرح لهم
CREATE POLICY "Users can view supplier currencies" 
  ON public.supplier_currencies 
  FOR SELECT 
  USING (true);

-- سياسة للإدراج - السماح للمستخدمين المصرح لهم فقط
CREATE POLICY "Authorized users can insert supplier currencies" 
  ON public.supplier_currencies 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- سياسة للتحديث - السماح للمستخدمين المصرح لهم فقط
CREATE POLICY "Authorized users can update supplier currencies" 
  ON public.supplier_currencies 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- سياسة للحذف - السماح للمستخدمين المصرح لهم فقط
CREATE POLICY "Authorized users can delete supplier currencies" 
  ON public.supplier_currencies 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- إضافة مشغل لتحديث updated_at
CREATE TRIGGER update_supplier_currencies_updated_at
  BEFORE UPDATE ON public.supplier_currencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة للتأكد من وجود عملة أساسية واحدة فقط لكل مورد
CREATE OR REPLACE FUNCTION ensure_single_primary_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كانت العملة الجديدة أساسية، قم بإلغاء تعيين العملات الأساسية الأخرى
  IF NEW.is_primary = true THEN
    UPDATE public.supplier_currencies 
    SET is_primary = false, updated_at = now()
    WHERE supplier_id = NEW.supplier_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة المشغل
CREATE TRIGGER ensure_single_primary_currency_trigger
  BEFORE INSERT OR UPDATE ON public.supplier_currencies
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_currency();

-- نقل البيانات الموجودة من preferred_currency إلى الجدول الجديد
INSERT INTO public.supplier_currencies (supplier_id, currency, is_primary)
SELECT id, preferred_currency, true
FROM public.suppliers
WHERE preferred_currency IS NOT NULL;
