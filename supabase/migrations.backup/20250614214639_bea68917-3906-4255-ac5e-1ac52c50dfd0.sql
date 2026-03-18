
-- إضافة foreign key constraints لربط الفواتير بالحجوزات
-- نحتاج لربط invoices.booking_id مع hotel_bookings.id أو flight_bookings.id

-- إضافة عمود لتحديد نوع الحجز في جدول الفواتير
ALTER TABLE public.invoices 
ADD COLUMN booking_type TEXT CHECK (booking_type IN ('hotel', 'flight'));

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX idx_invoices_booking_type ON public.invoices(booking_type);

-- تحديث الفواتير الموجودة لتحديد نوع الحجز
-- (سنفترض أن الفواتير الموجودة مرتبطة بحجوزات الفنادق)
UPDATE public.invoices 
SET booking_type = 'hotel' 
WHERE booking_type IS NULL;

-- جعل العمود مطلوب
ALTER TABLE public.invoices 
ALTER COLUMN booking_type SET NOT NULL;
