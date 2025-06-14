
-- إنشاء حساب السوبر أدمن مباشرة في قاعدة البيانات
-- سنستخدم UUID ثابت للسوبر أدمن
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES (
  '2480d34a-20bf-4e17-bf8b-b711fbc80406'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res@vogatchitrips.com',
  crypt('Voga@12345@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Admin"}',
  false,
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- إدراج profile للسوبر أدمن
INSERT INTO public.profiles (id, email, full_name, is_active)
VALUES (
  '2480d34a-20bf-4e17-bf8b-b711fbc80406'::uuid,
  'Res@vogatchitrips.com',
  'Super Admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- إضافة دور السوبر أدمن
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '2480d34a-20bf-4e17-bf8b-b711fbc80406'::uuid,
  'super_admin'::user_role
) ON CONFLICT (user_id, role) DO NOTHING;
