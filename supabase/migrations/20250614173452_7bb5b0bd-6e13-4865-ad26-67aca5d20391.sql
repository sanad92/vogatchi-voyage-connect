-- المرحلة الأولى: إضافة دور super_admin فقط
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'super_admin'
      AND enumtypid = 'public.user_role'::regtype
  ) THEN
    EXECUTE 'ALTER TYPE public.user_role ADD VALUE ''super_admin''';
  END IF;
END $$;
