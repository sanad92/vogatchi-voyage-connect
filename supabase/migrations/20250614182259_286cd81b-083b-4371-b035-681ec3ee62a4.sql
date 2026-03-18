
-- إنشاء جدول مهام المتابعة التلقائية
CREATE TABLE IF NOT EXISTS public.customer_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('pre_arrival_2days', 'pre_arrival_1day', 'arrival_day', 'post_checkout')),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول سجل التواصل مع العملاء
CREATE TABLE IF NOT EXISTS public.customer_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  follow_up_id UUID REFERENCES public.customer_follow_ups(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('call', 'whatsapp', 'email', 'sms', 'meeting')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('successful', 'no_answer', 'busy', 'failed', 'scheduled')),
  content TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  handled_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول ملاحظات العملاء
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('general', 'preference', 'complaint', 'special_request', 'medical', 'dietary')),
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول تقييمات خدمة العملاء
CREATE TABLE IF NOT EXISTS public.customer_satisfaction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  feedback TEXT,
  survey_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_follow_ups_scheduled_date ON public.customer_follow_ups(scheduled_date);
CREATE INDEX idx_follow_ups_status ON public.customer_follow_ups(status);
CREATE INDEX idx_follow_ups_assigned_to ON public.customer_follow_ups(assigned_to);
CREATE INDEX idx_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX idx_communications_completed_at ON public.customer_communications(completed_at);
CREATE INDEX idx_notes_customer_id ON public.customer_notes(customer_id);
CREATE INDEX idx_notes_priority ON public.customer_notes(priority);

-- تمكين Row Level Security
ALTER TABLE public.customer_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_satisfaction ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان الأساسية (سيتم تحديثها لاحقاً حسب الأدوار)
CREATE POLICY "Allow authenticated users to view follow_ups" ON public.customer_follow_ups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage follow_ups" ON public.customer_follow_ups
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view communications" ON public.customer_communications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage communications" ON public.customer_communications
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view notes" ON public.customer_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage notes" ON public.customer_notes
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to view satisfaction" ON public.customer_satisfaction
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage satisfaction" ON public.customer_satisfaction
  FOR ALL TO authenticated USING (true);

-- دالة لإنشاء مهام المتابعة التلقائية عند إنشاء حجز جديد
CREATE OR REPLACE FUNCTION public.create_follow_up_tasks()
RETURNS TRIGGER AS $$
DECLARE
  checkin_date DATE;
BEGIN
  -- الحصول على تاريخ الوصول
  checkin_date := NEW.check_in_date;
  
  -- إنشاء مهمة المتابعة قبل الوصول بيومين
  IF checkin_date IS NOT NULL AND checkin_date > CURRENT_DATE + INTERVAL '2 days' THEN
-- INSERT INTO public.customer_follow_ups (booking_id, customer_id, follow_up_type, scheduled_date)
--     VALUES (NEW.id, NEW.customer_id, 'pre_arrival_2days', checkin_date - INTERVAL '2 days');
  END IF;
  
  -- إنشاء مهمة المتابعة قبل الوصول بيوم واحد
  IF checkin_date IS NOT NULL AND checkin_date > CURRENT_DATE + INTERVAL '1 day' THEN
-- INSERT INTO public.customer_follow_ups (booking_id, customer_id, follow_up_type, scheduled_date)
--     VALUES (NEW.id, NEW.customer_id, 'pre_arrival_1day', checkin_date - INTERVAL '1 day');
  END IF;
  
  -- إنشاء مهمة المتابعة في يوم الوصول
  IF checkin_date IS NOT NULL THEN
-- INSERT INTO public.customer_follow_ups (booking_id, customer_id, follow_up_type, scheduled_date)
--     VALUES (NEW.id, NEW.customer_id, 'arrival_day', checkin_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتشغيل الدالة عند إنشاء حجز جديد
CREATE TRIGGER trigger_create_follow_up_tasks
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_up_tasks();
