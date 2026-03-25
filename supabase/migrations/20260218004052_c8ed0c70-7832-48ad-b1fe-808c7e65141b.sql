
-- حذف وإعادة إنشاء الوظيفة بأسماء معاملات صحيحة
DROP FUNCTION IF EXISTS public.update_booking_status(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_booking_type TEXT,
  p_new_status_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_booking_type = 'hotel' THEN
    UPDATE public.hotel_bookings SET status_id = p_new_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'flight' THEN
    UPDATE public.flight_bookings SET status_id = p_new_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'transport' THEN
    UPDATE public.transport_bookings SET status_id = p_new_status_id, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_booking_type = 'car_rental' THEN
    UPDATE public.car_rentals SET status_id = p_new_status_id, updated_at = now() WHERE id = p_booking_id;
  END IF;
  RETURN TRUE;
END;
$$;

-- إضافة أعمدة مفقودة
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,4) DEFAULT 1;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- إضافة foreign keys للعلاقات المفقودة
ALTER TABLE public.customer_follow_ups DROP CONSTRAINT IF EXISTS fk_follow_up_assigned;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_uidx ON public.profiles(id);
ALTER TABLE public.customer_follow_ups ADD CONSTRAINT fk_follow_up_assigned 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_conversations DROP CONSTRAINT IF EXISTS fk_wa_conv_assigned;
ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT fk_wa_conv_assigned
  FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL;
