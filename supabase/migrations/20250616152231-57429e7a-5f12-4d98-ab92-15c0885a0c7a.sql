
-- إضافة حقل created_by إلى جدول customers لتسجيل من أضاف العميل
ALTER TABLE public.customers 
ADD COLUMN created_by uuid REFERENCES public.profiles(id);

-- إضافة حقل last_follow_up_date لتسجيل آخر متابعة
ALTER TABLE public.customers 
ADD COLUMN last_follow_up_date timestamp with time zone;

-- إضافة حقل last_follow_up_by لتسجيل من قام بآخر متابعة
ALTER TABLE public.customers 
ADD COLUMN last_follow_up_by uuid REFERENCES public.profiles(id);

-- إنشاء فنكشن لتحديث بيانات آخر متابعة عند إضافة متابعة جديدة
CREATE OR REPLACE FUNCTION update_customer_last_follow_up()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث بيانات آخر متابعة في جدول العملاء
  UPDATE public.customers 
  SET 
    last_follow_up_date = NEW.completed_at,
    last_follow_up_by = NEW.assigned_to,
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث بيانات آخر متابعة تلقائياً
CREATE TRIGGER trigger_update_customer_last_follow_up
  AFTER UPDATE OF completed_at ON public.customer_follow_ups
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
  EXECUTE FUNCTION update_customer_last_follow_up();

-- إضافة فنكشن لتسجيل created_by تلقائياً عند إضافة عميل جديد
CREATE OR REPLACE FUNCTION set_customer_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- تعيين المستخدم الحالي كمن أضاف العميل
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتسجيل created_by تلقائياً
CREATE TRIGGER trigger_set_customer_created_by
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_created_by();
