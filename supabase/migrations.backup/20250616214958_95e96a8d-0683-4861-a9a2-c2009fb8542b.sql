
-- تحديث اسم الموظف في جدول employees
UPDATE public.employees 
SET full_name = 'Mohamed Salah', updated_at = now()
WHERE id = '436b3200-2859-41b8-961f-4d59dd3d9d7a';

-- تحديث اسم المستخدم في جدول profiles
UPDATE public.profiles 
SET full_name = 'Mohamed Salah', updated_at = now()
WHERE id = '2480d34a-20bf-4e17-bf8b-b711fbc80406';
