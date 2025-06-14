
-- إنشاء جدول لتقسيم العملاء (Customer Segments)
CREATE TABLE public.customer_segments (
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
CREATE TABLE public.customer_loyalty_points (
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
CREATE TABLE public.loyalty_rewards (
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
CREATE TABLE public.marketing_campaigns (
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
CREATE TABLE public.campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول للإشعارات
CREATE TABLE public.notifications (
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
CREATE TABLE public.backup_logs (
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
ALTER TABLE public.customers 
ADD COLUMN segment_id UUID REFERENCES public.customer_segments(id),
ADD COLUMN loyalty_points INTEGER DEFAULT 0,
ADD COLUMN total_bookings INTEGER DEFAULT 0,
ADD COLUMN total_spent NUMERIC DEFAULT 0,
ADD COLUMN last_booking_date DATE,
ADD COLUMN preferences JSONB DEFAULT '{}',
ADD COLUMN communication_preferences JSONB DEFAULT '{"whatsapp": true, "email": true, "sms": false}';

-- إدراج تقسيمات العملاء الافتراضية
INSERT INTO public.customer_segments (name, name_ar, description, color, minimum_bookings, minimum_total_spent) VALUES
('VIP', 'كبار الشخصيات', 'عملاء كبار الشخصيات مع خدمة مميزة', '#gold', 10, 50000),
('Premium', 'مميز', 'عملاء مميزون مع حجوزات متكررة', '#purple-600', 5, 25000),
('Regular', 'عادي', 'عملاء عاديون', '#blue-500', 1, 0),
('New', 'جديد', 'عملاء جدد بدون حجوزات سابقة', '#green-500', 0, 0);

-- إدراج مكافآت نقاط الولاء الافتراضية
INSERT INTO public.loyalty_rewards (name, name_ar, description, points_required, reward_type, reward_value) VALUES
('خصم 5%', 'خصم 5%', 'خصم 5% على الحجز التالي', 500, 'discount_percentage', 5),
('خصم 10%', 'خصم 10%', 'خصم 10% على الحجز التالي', 1000, 'discount_percentage', 10),
('خصم 200 جنيه', 'خصم 200 جنيه', 'خصم 200 جنيه على الحجز التالي', 800, 'discount_amount', 200),
('خصم 500 جنيه', 'خصم 500 جنيه', 'خصم 500 جنيه على الحجز التالي', 2000, 'discount_amount', 500);

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
  INSERT INTO public.customer_loyalty_points (
    customer_id, 
    points_earned, 
    current_balance, 
    booking_id, 
    transaction_type, 
    description
  ) VALUES (
    NEW.customer_id, 
    points_to_add, 
    points_to_add, 
    NEW.id, 
    'earned', 
    'نقاط مكتسبة من الحجز ' || NEW.internal_booking_number
  );
  
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
CREATE TRIGGER hotel_booking_loyalty_points_trigger
  AFTER INSERT ON public.hotel_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_loyalty_points();

CREATE TRIGGER customer_segment_update_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_segment();

-- إضافة فهارس لتحسين الأداء
CREATE INDEX idx_customer_loyalty_points_customer_id ON public.customer_loyalty_points(customer_id);
CREATE INDEX idx_customer_segments_active ON public.customer_segments(is_active);
CREATE INDEX idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
