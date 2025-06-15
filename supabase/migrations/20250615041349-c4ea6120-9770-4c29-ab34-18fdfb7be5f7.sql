
-- إنشاء جدول لتسجيل عمليات "Login As User"
CREATE TABLE public.admin_impersonation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  impersonation_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  impersonation_ended_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول لجلسات السوبر أدمن النشطة
CREATE TABLE public.admin_active_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  original_session_id TEXT NOT NULL,
  impersonated_user_id UUID REFERENCES auth.users(id),
  is_impersonating BOOLEAN DEFAULT FALSE,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_admin_impersonation_log_admin_id ON public.admin_impersonation_log(admin_id);
CREATE INDEX idx_admin_impersonation_log_target_user_id ON public.admin_impersonation_log(target_user_id);
CREATE INDEX idx_admin_active_sessions_admin_id ON public.admin_active_sessions(admin_id);

-- تمكين RLS
ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_active_sessions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - السوبر أدمن فقط
CREATE POLICY "Super admins can manage impersonation logs" ON public.admin_impersonation_log
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage active sessions" ON public.admin_active_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- دالة لبدء عملية Login As User
CREATE OR REPLACE FUNCTION public.start_impersonation(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  session_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  new_session_id TEXT;
BEGIN
  -- التحقق من أن المستخدم الحالي سوبر أدمن
  admin_user_id := auth.uid();
  
  IF NOT public.has_role(admin_user_id, 'super_admin') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: السوبر أدمن فقط يمكنه استخدام هذه الميزة', NULL::TEXT;
    RETURN;
  END IF;
  
  -- التحقق من وجود المستخدم المستهدف
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND is_active = TRUE) THEN
    RETURN QUERY SELECT FALSE, 'المستخدم المستهدف غير موجود أو غير نشط', NULL::TEXT;
    RETURN;
  END IF;
  
  -- إنشاء session ID جديد
  new_session_id := encode(gen_random_bytes(32), 'hex');
  
  -- تسجيل العملية في admin_impersonation_log
  INSERT INTO public.admin_impersonation_log (
    admin_id,
    target_user_id,
    reason,
    ip_address,
    user_agent
  ) VALUES (
    admin_user_id,
    p_target_user_id,
    p_reason,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  -- إنشاء جلسة نشطة
  INSERT INTO public.admin_active_sessions (
    admin_id,
    original_session_id,
    impersonated_user_id,
    is_impersonating,
    expires_at
  ) VALUES (
    admin_user_id,
    new_session_id,
    p_target_user_id,
    TRUE,
    now() + INTERVAL '4 hours'
  );
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'user_impersonation_started',
    'profiles',
    p_target_user_id,
    NULL,
    jsonb_build_object('reason', p_reason),
    'بدء تسجيل دخول كمستخدم: ' || (SELECT email FROM public.profiles WHERE id = p_target_user_id)
  );
  
  RETURN QUERY SELECT TRUE, 'تم بدء عملية تسجيل الدخول بنجاح', new_session_id;
END;
$$;

-- دالة لإنهاء عملية Login As User
CREATE OR REPLACE FUNCTION public.end_impersonation(p_session_id TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  target_user_id UUID;
BEGIN
  admin_user_id := auth.uid();
  
  -- الحصول على بيانات الجلسة
  SELECT impersonated_user_id INTO target_user_id
  FROM public.admin_active_sessions
  WHERE original_session_id = p_session_id AND admin_id = admin_user_id;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'جلسة غير صالحة أو منتهية الصلاحية';
    RETURN;
  END IF;
  
  -- تحديث وقت الانتهاء في impersonation log
  UPDATE public.admin_impersonation_log
  SET impersonation_ended_at = now()
  WHERE admin_id = admin_user_id 
    AND target_user_id = target_user_id 
    AND impersonation_ended_at IS NULL;
  
  -- حذف الجلسة النشطة
  DELETE FROM public.admin_active_sessions
  WHERE original_session_id = p_session_id AND admin_id = admin_user_id;
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'user_impersonation_ended',
    'profiles',
    target_user_id,
    NULL,
    NULL,
    'إنهاء تسجيل دخول كمستخدم: ' || (SELECT email FROM public.profiles WHERE id = target_user_id)
  );
  
  RETURN QUERY SELECT TRUE, 'تم إنهاء عملية تسجيل الدخول بنجاح';
END;
$$;

-- دالة لإعادة تعيين كلمة المرور من السوبر أدمن
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  user_email TEXT;
BEGIN
  admin_user_id := auth.uid();
  
  -- التحقق من صلاحيات السوبر أدمن
  IF NOT public.has_role(admin_user_id, 'super_admin') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: السوبر أدمن فقط يمكنه إعادة تعيين كلمات المرور';
    RETURN;
  END IF;
  
  -- الحصول على بيانات المستخدم
  SELECT email INTO user_email FROM public.profiles WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN QUERY SELECT FALSE, 'المستخدم غير موجود';
    RETURN;
  END IF;
  
  -- تحديث كلمة المرور في auth.users
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'password_reset_by_admin',
    'profiles',
    p_user_id,
    NULL,
    NULL,
    'إعادة تعيين كلمة مرور المستخدم: ' || user_email
  );
  
  RETURN QUERY SELECT TRUE, 'تم إعادة تعيين كلمة المرور بنجاح';
END;
$$;

-- دالة لإنشاء مستخدم جديد مباشرة من السوبر أدمن
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_department TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'viewer'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  new_user_id UUID;
BEGIN
  admin_user_id := auth.uid();
  
  -- التحقق من صلاحيات السوبر أدمن
  IF NOT public.has_role(admin_user_id, 'super_admin') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: السوبر أدمن فقط يمكنه إنشاء المستخدمين', NULL::UUID;
    RETURN;
  END IF;
  
  -- التحقق من عدم وجود المستخدم مسبقاً
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, 'البريد الإلكتروني مستخدم بالفعل', NULL::UUID;
    RETURN;
  END IF;
  
  -- إنشاء معرف فريد للمستخدم الجديد
  new_user_id := gen_random_uuid();
  
  -- إدراج المستخدم الجديد في auth.users
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
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name),
    false
  );
  
  -- إنشاء profile للمستخدم
  INSERT INTO public.profiles (id, email, full_name, department, phone, is_active)
  VALUES (new_user_id, p_email, p_full_name, p_department, p_phone, true);
  
  -- تعيين الدور
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, p_role);
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'user_created_by_admin',
    'profiles',
    new_user_id,
    NULL,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role
    ),
    'إنشاء مستخدم جديد: ' || p_email
  );
  
  RETURN QUERY SELECT TRUE, 'تم إنشاء المستخدم بنجاح', new_user_id;
END;
$$;

-- تحديث دالة تحديث إعدادات النظام لتشمل المزيد من الخيارات
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  old_values JSONB;
  new_values JSONB;
BEGIN
  admin_user_id := auth.uid();
  
  -- التحقق من صلاحيات السوبر أدمن
  IF NOT public.has_role(admin_user_id, 'super_admin') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: السوبر أدمن فقط يمكنه تحديث ملفات المستخدمين';
    RETURN;
  END IF;
  
  -- الحصول على القيم القديمة
  SELECT jsonb_build_object(
    'email', email,
    'full_name', full_name,
    'department', department,
    'phone', phone,
    'is_active', is_active
  ) INTO old_values
  FROM public.profiles WHERE id = p_user_id;
  
  IF old_values IS NULL THEN
    RETURN QUERY SELECT FALSE, 'المستخدم غير موجود';
    RETURN;
  END IF;
  
  -- تحديث الملف الشخصي
  UPDATE public.profiles SET
    email = COALESCE(p_email, email),
    full_name = COALESCE(p_full_name, full_name),
    department = COALESCE(p_department, department),
    phone = COALESCE(p_phone, phone),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_user_id;
  
  -- تحديث البريد الإلكتروني في auth.users إذا تم تغييره
  IF p_email IS NOT NULL THEN
    UPDATE auth.users SET
      email = p_email,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- إنشاء القيم الجديدة للسجل
  new_values := jsonb_build_object(
    'email', COALESCE(p_email, old_values->>'email'),
    'full_name', COALESCE(p_full_name, old_values->>'full_name'),
    'department', COALESCE(p_department, old_values->>'department'),
    'phone', COALESCE(p_phone, old_values->>'phone'),
    'is_active', COALESCE(p_is_active, (old_values->>'is_active')::boolean)
  );
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'user_profile_updated_by_admin',
    'profiles',
    p_user_id,
    old_values,
    new_values,
    'تحديث ملف مستخدم: ' || COALESCE(p_email, old_values->>'email')
  );
  
  RETURN QUERY SELECT TRUE, 'تم تحديث ملف المستخدم بنجاح';
END;
$$;
