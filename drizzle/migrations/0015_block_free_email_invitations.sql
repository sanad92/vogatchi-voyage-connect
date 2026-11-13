CREATE OR REPLACE FUNCTION public.is_free_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT split_part(lower(coalesce(_email,'')), '@', 2) = ANY (ARRAY['gmail.com','googlemail.com','yahoo.com','ymail.com','rocketmail.com','outlook.com','hotmail.com','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','mail.com','proton.me','protonmail.com','gmx.com','zoho.com','yandex.com'])
$$;
CREATE OR REPLACE FUNCTION public.block_free_email_invitation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF public.is_free_email(NEW.email) THEN
    RAISE EXCEPTION 'دعوات الموظفين تتطلب بريد عمل رسمي تابع للشركة، البريد المجاني غير مقبول.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_block_free_email_invitation ON public.invitations;
CREATE TRIGGER trg_block_free_email_invitation BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.block_free_email_invitation();
