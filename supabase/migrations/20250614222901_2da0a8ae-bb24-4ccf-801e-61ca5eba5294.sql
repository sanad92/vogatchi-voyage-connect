
-- إنشاء جدول لتقسيم العملاء (Customer Segments)
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#blue-500',
  minimum_bookings INTEGER DEFAULT 0,
  minimum_total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- إنشاء جدول لنقاط الولاء
CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_used INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  booking_id UUID REFERENCES public.hotel_bookings(id),
  transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول لمكافآت نقاط الولاء
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'discount_percentage', 'discount_amount', 'free_service'
  reward_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول للحملات التسويقية
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL, -- 'email', 'whatsapp', 'sms'
  target_segment_id UUID REFERENCES public.customer_segments(id),
  message_template TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed', 'paused'
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول لإرسال الحملات
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول للإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول للنسخ الاحتياطية
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL, -- 'automatic', 'manual'
  file_path TEXT,
  file_size BIGINT,
  status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID
);

-- إضافة عمود تقسيم العميل في جدول العملاء
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.customer_segments(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_booking_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"whatsapp": true, "email": true, "sms": false}';

-- إدراج تقسيمات العملاء الافتراضية
-- INSERT INTO public.customer_segments (name, name_ar, description, color, minimum_bookings, minimum_total_spent) VALUES
-- ('VIP', 'كبار الشخصيات', 'عملاء كبار الشخصيات مع خدمة مميزة', '#gold', 10, 50000),
-- ('Premium', 'مميز', 'عملاء مميزون مع حجوزات متكررة', '#purple-600', 5, 25000),
-- ('Regular', 'عادي', 'عملاء عاديون', '#blue-500', 1, 0),
-- ('New', 'جديد', 'عملاء جدد بدون حجوزات سابقة', '#green-500', 0, 0);

-- إدراج مكافآت نقاط الولاء الافتراضية
-- INSERT INTO public.loyalty_rewards (name, name_ar, description, points_required, reward_type, reward_value) VALUES
-- ('خصم 5%', 'خصم 5%', 'خصم 5% على الحجز التالي', 500, 'discount_percentage', 5),
-- ('خصم 10%', 'خصم 10%', 'خصم 10% على الحجز التالي', 1000, 'discount_percentage', 10),
-- ('خصم 200 جنيه', 'خصم 200 جنيه', 'خصم 200 جنيه على الحجز التالي', 800, 'discount_amount', 200),
-- ('خصم 500 جنيه', 'خصم 500 جنيه', 'خصم 500 جنيه على الحجز التالي', 2000, 'discount_amount', 500);

-- إنشاء دالة لحساب نقاط الولاء تلقائياً
CREATE OR REPLACE FUNCTION public.calculate_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add INTEGER;
BEGIN
  -- حساب النقاط بناءً على إجمالي التكلفة (نقطة واحدة لكل 100 جنيه)
  points_to_add := FLOOR(NEW.total_cost_customer / 100);
  
  -- إضافة النقاط للعميل
  UPDATE public.customers 
  SET loyalty_points = loyalty_points + points_to_add,
      total_bookings = total_bookings + 1,
      total_spent = total_spent + NEW.total_cost_customer,
      last_booking_date = NEW.check_in_date
  WHERE id = NEW.customer_id;
  
  -- تسجيل نقاط الولاء
-- INSERT INTO public.customer_loyalty_points (
--     customer_id, 
--     points_earned, 
--     current_balance, 
--     booking_id, 
--     transaction_type, 
--     description
--   ) VALUES (
--     NEW.customer_id, 
--     points_to_add, 
--     points_to_add, 
--     NEW.id, 
--     'earned', 
--     'نقاط مكتسبة من الحجز ' || NEW.internal_booking_number
--   );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لتحديث تقسيم العميل تلقائياً
CREATE OR REPLACE FUNCTION public.update_customer_segment()
RETURNS TRIGGER AS $$
DECLARE
  new_segment_id UUID;
BEGIN
  -- تحديد التقسيم المناسب بناءً على عدد الحجوزات والمبلغ المنفق
  SELECT id INTO new_segment_id
  FROM public.customer_segments 
  WHERE NEW.total_bookings >= minimum_bookings 
    AND NEW.total_spent >= minimum_total_spent
    AND is_active = true
  ORDER BY minimum_bookings DESC, minimum_total_spent DESC
  LIMIT 1;
  
  -- تحديث تقسيم العميل
  IF new_segment_id IS NOT NULL AND new_segment_id != OLD.segment_id THEN
    NEW.segment_id = new_segment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'hotel_booking_loyalty_points_trigger'
  ) THEN
    CREATE TRIGGER hotel_booking_loyalty_points_trigger
      AFTER INSERT ON public.hotel_bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.calculate_loyalty_points();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'customer_segment_update_trigger'
  ) THEN
    CREATE TRIGGER customer_segment_update_trigger
      BEFORE UPDATE ON public.customers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_customer_segment();
  END IF;
END $$;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_points_customer_id ON public.customer_loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON public.customer_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
