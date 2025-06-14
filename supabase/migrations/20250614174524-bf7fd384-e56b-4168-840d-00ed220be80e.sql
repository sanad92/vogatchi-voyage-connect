
-- تحديث حساب السوبر أدمن لتأكيد البريد الإلكتروني
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  email_change_confirm_status = 1,
  confirmation_sent_at = now()
WHERE email = 'Res@vogatchitrips.com';
