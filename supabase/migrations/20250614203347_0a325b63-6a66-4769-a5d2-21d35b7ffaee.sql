
-- إنشاء جدول حالات الحجز
CREATE TABLE IF NOT EXISTS public.booking_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#gray-500',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول تتبع تاريخ الحجز
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  status_id UUID REFERENCES public.booking_statuses(id) NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة عمود حالة الحجز للحجوزات الحالية
ALTER TABLE public.hotel_bookings 
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.booking_statuses(id);

-- إدراج الحالات الأساسية للحجز
-- INSERT INTO public.booking_statuses (name, name_ar, description, color, sort_order) VALUES
-- ('inquiry', 'استفسار', 'طلب استفسار من العميل', '#fbbf24', 1),
-- ('quotation_sent', 'عرض مرسل', 'تم إرسال عرض سعر للعميل', '#3b82f6', 2),
-- ('pending_confirmation', 'في انتظار التأكيد', 'في انتظار تأكيد العميل', '#f59e0b', 3),
-- ('confirmed', 'مؤكد', 'تم تأكيد الحجز من العميل', '#10b981', 4),
-- ('payment_pending', 'في انتظار الدفع', 'في انتظار دفع العميل', '#f59e0b', 5),
-- ('partially_paid', 'مدفوع جزئياً', 'تم دفع جزء من المبلغ', '#3b82f6', 6),
-- ('fully_paid', 'مدفوع بالكامل', 'تم دفع المبلغ كاملاً', '#10b981', 7),
-- ('voucher_issued', 'فاوتشر مصدر', 'تم إصدار فاوتشر الحجز', '#8b5cf6', 8),
-- ('service_started', 'بدء الخدمة', 'بدأت الخدمة الفعلية', '#06b6d4', 9),
-- ('service_completed', 'انتهاء الخدمة', 'انتهت الخدمة بنجاح', '#10b981', 10),
-- ('cancelled', 'ملغي', 'تم إلغاء الحجز', '#ef4444', 11),
-- ('refunded', 'مسترد', 'تم استرداد المبلغ', '#6b7280', 12);

-- تفعيل Row Level Security
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Enable all access for booking_statuses" ON public.booking_statuses FOR ALL USING (true);
CREATE POLICY "Enable all access for booking_status_history" ON public.booking_status_history FOR ALL USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_booking_status_history_booking_id ON public.booking_status_history(booking_id);
CREATE INDEX idx_booking_status_history_created_at ON public.booking_status_history(created_at);
CREATE INDEX idx_hotel_bookings_status_id ON public.hotel_bookings(status_id);

-- دالة لتحديث حالة الحجز مع تسجيل التاريخ
CREATE OR REPLACE FUNCTION update_booking_status(
  p_booking_id UUID,
  p_status_id UUID,
  p_changed_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- تحديث حالة الحجز
  UPDATE public.hotel_bookings 
  SET status_id = p_status_id, updated_at = now()
  WHERE id = p_booking_id;
  
  -- تسجيل التغيير في التاريخ
-- INSERT INTO public.booking_status_history (booking_id, status_id, changed_by, notes)
--   VALUES (p_booking_id, p_status_id, p_changed_by, p_notes);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على الحالة الحالية للحجز
CREATE OR REPLACE FUNCTION get_current_booking_status(p_booking_id UUID)
RETURNS TABLE(status_name TEXT, status_name_ar TEXT, color TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT bs.name, bs.name_ar, bs.color
  FROM public.hotel_bookings hb
  JOIN public.booking_statuses bs ON hb.status_id = bs.id
  WHERE hb.id = p_booking_id;
END;
$$ LANGUAGE plpgsql;
