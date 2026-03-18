
-- إضافة حقل العملة إلى جدول حجوزات الفنادق
ALTER TABLE public.hotel_bookings 
ADD COLUMN currency TEXT DEFAULT 'SAR' CHECK (currency IN ('SAR', 'EGP', 'USD', 'EUR'));

-- تحديث الوصف للحقل الجديد
COMMENT ON COLUMN public.hotel_bookings.currency IS 'العملة المستخدمة في الحجز (SAR: ريال سعودي، EGP: جنيه مصري، USD: دولار أمريكي، EUR: يورو)';

-- تحديث البيانات الموجودة لتستخدم الريال السعودي كعملة افتراضية
UPDATE public.hotel_bookings 
SET currency = 'SAR' 
WHERE currency IS NULL;
