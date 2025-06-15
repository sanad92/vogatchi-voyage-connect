
-- إضافة الحقول الجديدة لجدول customer_follow_ups
ALTER TABLE customer_follow_ups 
ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN customer_value text CHECK (customer_value IN ('vip', 'regular', 'new')),
ADD COLUMN last_contact_date timestamp with time zone;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX idx_customer_follow_ups_priority ON customer_follow_ups(priority);
CREATE INDEX idx_customer_follow_ups_customer_value ON customer_follow_ups(customer_value);
CREATE INDEX idx_customer_follow_ups_last_contact ON customer_follow_ups(last_contact_date);
