
-- إضافة عمود supplier_id وجدول الربط للمورد في جدول الحجوزات
ALTER TABLE public.hotel_bookings
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- إضافة index للأداء
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_supplier_id 
  ON public.hotel_bookings(supplier_id);
