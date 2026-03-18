
-- حذف الوظيفة القديمة وإعادة إنشائها بالمعاملات الصحيحة
DROP FUNCTION IF EXISTS public.update_booking_status(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_booking_type TEXT DEFAULT 'hotel',
  p_status_id UUID DEFAULT NULL,
  p_new_status_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_id UUID;
BEGIN
  v_status_id := COALESCE(p_status_id, p_new_status_id);
  IF p_booking_type = 'hotel' THEN
    UPDATE public.hotel_bookings SET status_id = v_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'flight' THEN
    UPDATE public.flight_bookings SET status_id = v_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'transport' THEN
    UPDATE public.transport_bookings SET status_id = v_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'car_rental' THEN
    UPDATE public.car_rentals SET status_id = v_status_id, updated_at = now() WHERE id = p_booking_id;
  END IF;
  RETURN TRUE;
END;
$$;

-- إضافة عمود employee_id لجدول profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linked_employee_id UUID;

-- وظيفة ربط المستخدم بالموظف
CREATE OR REPLACE FUNCTION public.link_user_to_employee(
  p_user_id UUID,
  p_employee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET linked_employee_id = p_employee_id, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'تم الربط بنجاح');
END;
$$;

-- وظيفة إلغاء ربط المستخدم بالموظف
CREATE OR REPLACE FUNCTION public.unlink_user_from_employee(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET linked_employee_id = NULL, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', 'تم إلغاء الربط بنجاح');
END;
$$;

-- إضافة جداول CMS المفقودة
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pages" ON public.pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}',
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage blocks" ON public.blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
