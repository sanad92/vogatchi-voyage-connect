
-- إنشاء جدول أسعار الصرف
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(15,6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(from_currency, to_currency, effective_date)
);

-- إنشاء جدول الحسابات البنكية
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT NOT NULL,
  account_type TEXT DEFAULT 'checking',
  current_balance NUMERIC(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- إنشاء جدول حركات الحسابات البنكية
CREATE TABLE public.bank_account_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  transaction_type TEXT NOT NULL, -- 'debit', 'credit'
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  related_invoice_id UUID REFERENCES public.invoices(id),
  related_payment_order_id UUID REFERENCES public.payment_orders(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users
);

-- إضافة عمود للحساب البنكي في جدول أوامر الدفع
ALTER TABLE public.payment_orders 
ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id),
ADD COLUMN exchange_rate NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN amount_in_account_currency NUMERIC(15,2);

-- إضافة عمود سعر الصرف للفواتير
ALTER TABLE public.invoices 
ADD COLUMN exchange_rate_to_egp NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN total_amount_egp NUMERIC(15,2),
ADD COLUMN exchange_rate_to_usd NUMERIC(15,6),
ADD COLUMN total_amount_usd NUMERIC(15,2);

-- إدراج أسعار صرف أساسية
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
('EGP', 'USD', 0.032, CURRENT_DATE),
('USD', 'EGP', 31.00, CURRENT_DATE),
('SAR', 'EGP', 8.25, CURRENT_DATE),
('EGP', 'SAR', 0.121, CURRENT_DATE),
('SAR', 'USD', 0.267, CURRENT_DATE),
('USD', 'SAR', 3.75, CURRENT_DATE);

-- إدراج حسابات بنكية نموذجية
INSERT INTO public.bank_accounts (account_name, bank_name, account_number, currency, account_type) VALUES
('الحساب الجاري بالجنيه المصري', 'البنك الأهلي المصري', '1234567890123', 'EGP', 'checking'),
('الحساب الجاري بالدولار الأمريكي', 'البنك الأهلي المصري', '1234567890124', 'USD', 'checking'),
('حساب التوفير بالجنيه المصري', 'بنك مصر', '9876543210987', 'EGP', 'savings');

-- دالة لتحديث رصيد الحساب البنكي
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'credit' THEN
    UPDATE public.bank_accounts 
    SET current_balance = current_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.bank_account_id;
  ELSIF NEW.transaction_type = 'debit' THEN
    UPDATE public.bank_accounts 
    SET current_balance = current_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.bank_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتحديث رصيد الحساب البنكي
CREATE TRIGGER update_bank_balance_trigger
  AFTER INSERT ON public.bank_account_transactions
  FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

-- دالة لجلب سعر الصرف الحالي
CREATE OR REPLACE FUNCTION get_current_exchange_rate(from_curr TEXT, to_curr TEXT)
RETURNS NUMERIC AS $$
DECLARE
  current_rate NUMERIC;
BEGIN
  SELECT rate INTO current_rate
  FROM public.exchange_rates
  WHERE from_currency = from_curr 
    AND to_currency = to_curr
    AND is_active = true
  ORDER BY effective_date DESC
  LIMIT 1;
  
  RETURN COALESCE(current_rate, 1.00);
END;
$$ LANGUAGE plpgsql;

-- تحديث الفواتير الموجودة لحساب القيم بالعملات المختلفة
CREATE OR REPLACE FUNCTION update_invoice_multi_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب القيمة بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate_to_egp = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.total_amount_egp = NEW.final_amount * NEW.exchange_rate_to_egp;
  ELSE
    NEW.exchange_rate_to_egp = 1.00;
    NEW.total_amount_egp = NEW.final_amount;
  END IF;
  
  -- حساب القيمة بالدولار الأمريكي
  IF NEW.currency != 'USD' THEN
    NEW.exchange_rate_to_usd = get_current_exchange_rate(NEW.currency, 'USD');
    NEW.total_amount_usd = NEW.final_amount * NEW.exchange_rate_to_usd;
  ELSE
    NEW.exchange_rate_to_usd = 1.00;
    NEW.total_amount_usd = NEW.final_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتحديث قيم الفواتير متعددة العملات
CREATE TRIGGER invoice_multi_currency_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoice_multi_currency();

-- دالة لحساب مبلغ أمر الدفع بعملة الحساب البنكي
CREATE OR REPLACE FUNCTION calculate_payment_order_amount()
RETURNS TRIGGER AS $$
DECLARE
  account_currency TEXT;
  order_currency TEXT;
BEGIN
  -- جلب عملة الحساب البنكي
  SELECT currency INTO account_currency
  FROM public.bank_accounts
  WHERE id = NEW.bank_account_id;
  
  -- جلب عملة الفاتورة
  SELECT currency INTO order_currency
  FROM public.invoices
  WHERE id = NEW.invoice_id;
  
  -- حساب سعر الصرف والمبلغ بعملة الحساب
  IF account_currency = order_currency THEN
    NEW.exchange_rate = 1.00;
    NEW.amount_in_account_currency = NEW.amount;
  ELSE
    NEW.exchange_rate = get_current_exchange_rate(order_currency, account_currency);
    NEW.amount_in_account_currency = NEW.amount * NEW.exchange_rate;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لحساب مبلغ أمر الدفع
CREATE TRIGGER payment_order_currency_trigger
  BEFORE INSERT OR UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION calculate_payment_order_amount();
