
-- إصلاح دالة end_impersonation لحل مشكلة العمود الغامض
DROP FUNCTION IF EXISTS public.end_impersonation(text);

CREATE OR REPLACE FUNCTION public.end_impersonation(p_session_id text)
RETURNS TABLE(
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  impersonated_user_id UUID;
BEGIN
  admin_user_id := auth.uid();
  
  -- الحصول على بيانات الجلسة مع تحديد واضح للجداول
  SELECT aas.impersonated_user_id INTO impersonated_user_id
  FROM public.admin_active_sessions aas
  WHERE aas.original_session_id = p_session_id 
    AND aas.admin_id = admin_user_id;
  
  IF impersonated_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'جلسة غير صالحة أو منتهية الصلاحية';
    RETURN;
  END IF;
  
  -- تحديث وقت الانتهاء في impersonation log مع تحديد واضح للجداول
  UPDATE public.admin_impersonation_log ail
  SET impersonation_ended_at = now()
  WHERE ail.admin_id = admin_user_id 
    AND ail.target_user_id = impersonated_user_id 
    AND ail.impersonation_ended_at IS NULL;
  
  -- حذف الجلسة النشطة
  DELETE FROM public.admin_active_sessions aas
  WHERE aas.original_session_id = p_session_id 
    AND aas.admin_id = admin_user_id;
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'user_impersonation_ended',
    'profiles',
    impersonated_user_id,
    NULL,
    NULL,
    'إنهاء تسجيل دخول كمستخدم: ' || (SELECT p.email FROM public.profiles p WHERE p.id = impersonated_user_id)
  );
  
  RETURN QUERY SELECT TRUE, 'تم إنهاء عملية تسجيل الدخول بنجاح';
END;
$$;
