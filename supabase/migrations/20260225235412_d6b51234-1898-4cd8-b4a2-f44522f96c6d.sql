
-- Step 1: Drop user_roles table and all its dependencies
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Step 2: Drop old user_role enum type if it exists
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Step 3: Drop old functions that reference user_roles
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;

-- Step 4: Update handle_new_user to NOT insert into user_roles anymore
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
-- INSERT INTO public.profiles (id, full_name, email)
--   VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  RETURN NEW;
END;
$function$;
