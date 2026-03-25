
-- إنشاء المستخدمين الجدد في auth.users
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
) VALUES 
-- المستخدم الأول: Res1@vogatchitrips.com
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res1@vogatchitrips.com',
  crypt('Res123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "موظف الحجوزات 1"}',
  false,
  now()
),
-- المستخدم الثاني: Res2@vogatchitrips.com
(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res2@vogatchitrips.com',
  crypt('Res234567', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "موظف الحجوزات 2"}',
  false,
  now()
),
-- المستخدم الثالث: Res3@vogatchitrips.com
(
  '33333333-3333-3333-3333-333333333333'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res3@vogatchitrips.com',
  crypt('Res345678', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "موظف الحجوزات 3"}',
  false,
  now()
),
-- المستخدم الرابع: Res4@vogatchitrips.com
(
  '44444444-4444-4444-4444-444444444444'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res4@vogatchitrips.com',
  crypt('Res456789', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "موظف الحجوزات 4"}',
  false,
  now()
),
-- المستخدم الخامس: Res5@vogatchitrips.com
(
  '55555555-5555-5555-5555-555555555555'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'Res5@vogatchitrips.com',
  crypt('Res567890', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "موظف الحجوزات 5"}',
  false,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- إنشاء profiles للمستخدمين الجدد
INSERT INTO public.profiles (id, email, full_name, department, phone, is_active) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'Res1@vogatchitrips.com', 'موظف الحجوزات 1', 'الحجوزات', '+966500000001', true),
('22222222-2222-2222-2222-222222222222'::uuid, 'Res2@vogatchitrips.com', 'موظف الحجوزات 2', 'الحجوزات', '+966500000002', true),
('33333333-3333-3333-3333-333333333333'::uuid, 'Res3@vogatchitrips.com', 'موظف الحجوزات 3', 'الحجوزات', '+966500000003', true),
('44444444-4444-4444-4444-444444444444'::uuid, 'Res4@vogatchitrips.com', 'موظف الحجوزات 4', 'الحجوزات', '+966500000004', true),
('55555555-5555-5555-5555-555555555555'::uuid, 'Res5@vogatchitrips.com', 'موظف الحجوزات 5', 'الحجوزات', '+966500000005', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  department = EXCLUDED.department,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active;

-- تعيين دور sales_agent لجميع المستخدمين الجدد
INSERT INTO public.user_roles (user_id, role) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'sales_agent'::user_role),
('22222222-2222-2222-2222-222222222222'::uuid, 'sales_agent'::user_role),
('33333333-3333-3333-3333-333333333333'::uuid, 'sales_agent'::user_role),
('44444444-4444-4444-4444-444444444444'::uuid, 'sales_agent'::user_role),
('55555555-5555-5555-5555-555555555555'::uuid, 'sales_agent'::user_role)
ON CONFLICT (user_id, role) DO NOTHING;
