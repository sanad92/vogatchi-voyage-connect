
-- إضافة foreign key constraints لربط الفواتير بالحجوزات
-- نحتاج لربط invoices.booking_id مع hotel_bookings.id أو flight_bookings.id

-- إضافة عمود لتحديد نوع الحجز في جدول الفواتير
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS booking_type TEXT CHECK (booking_type IN ('hotel', 'flight'));

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_type ON public.invoices(booking_type);

-- تحديث الفواتير الموجودة لتحديد نوع الحجز
-- (سنفترض أن الفواتير الموجودة مرتبطة بحجوزات الفنادق)
UPDATE public.invoices 
SET booking_type = 'hotel' 
WHERE booking_type IS NULL;

-- جعل العمود مطلوب
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'booking_type'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.invoices
    ALTER COLUMN booking_type SET NOT NULL;
  END IF;
END $$;
