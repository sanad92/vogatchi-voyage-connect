
-- إنشاء جدول أنواع الطلبات الخاصة
CREATE TABLE IF NOT EXISTS public.special_request_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'bed_type', 'room_type', 'amenities', 'accessibility', 'other'
  has_extra_cost BOOLEAN DEFAULT FALSE,
  extra_cost_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول ربط الطلبات الخاصة بالحجوزات
CREATE TABLE IF NOT EXISTS public.booking_special_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  special_request_type_id UUID REFERENCES public.special_request_types(id),
  custom_request_text TEXT, -- للطلبات المخصصة
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدخال البيانات الأساسية للطلبات الخاصة
-- INSERT INTO public.special_request_types (name, category) VALUES
-- أنواع الأسرّة
-- ('King Size Bed', 'bed_type'),
-- ('Twin Beds', 'bed_type'),
-- ('Double Bed', 'bed_type'),
-- ('Single Bed', 'bed_type'),
-- ('Extra Bed', 'bed_type'),

-- أنواع الغرف
-- ('Non-Smoking Room', 'room_type'),
-- ('Smoking Room', 'room_type'),
-- ('Connecting Rooms', 'room_type'),
-- ('Adjacent Rooms', 'room_type'),
-- ('High Floor', 'room_type'),
-- ('Low Floor', 'room_type'),
-- ('Sea View', 'room_type'),
-- ('City View', 'room_type'),
-- ('Garden View', 'room_type'),

-- وسائل الراحة
-- ('Late Check-in', 'amenities'),
-- ('Early Check-in', 'amenities'),
-- ('Late Check-out', 'amenities'),
-- ('Airport Transfer', 'amenities'),
-- ('Extra Towels', 'amenities'),
-- ('Extra Pillows', 'amenities'),
-- ('Mini Fridge', 'amenities'),
-- ('Baby Cot', 'amenities'),

-- إمكانية الوصول
-- ('Wheelchair Accessible', 'accessibility'),
-- ('Ground Floor Room', 'accessibility'),
-- ('Elevator Access', 'accessibility'),

-- أخرى
-- ('Quiet Room', 'other'),
-- ('Room Away from Elevator', 'other'),
-- ('Honeymoon Setup', 'other'),
-- ('Birthday Setup', 'other');

-- إنشاء فهارس للأداء
CREATE INDEX idx_booking_special_requests_booking_id ON public.booking_special_requests(booking_id);
CREATE INDEX idx_special_request_types_category ON public.special_request_types(category);
CREATE INDEX idx_special_request_types_active ON public.special_request_types(is_active);
