CREATE OR REPLACE FUNCTION public.is_free_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM unnest(ARRAY['gmail.com','googlemail.com','yahoo.com','ymail.com','rocketmail.com','outlook.com','hotmail.com','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','mail.com','proton.me','protonmail.com','gmx.com','zoho.com','yandex.com']) d
 WHERE split_part(lower(btrim(coalesce(_email,''))), '@', 2) = d
 OR split_part(lower(btrim(coalesce(_email,''))), '@', 2) LIKE '%.' || d)
$$;
CREATE OR REPLACE FUNCTION public.block_free_email_invitation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF public.is_free_email(NEW.email) THEN
  RAISE EXCEPTION 'دعوات الموظفين تتطلب بريد عمل رسمي تابع للشركة، البريد المجاني غير مقبول.' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_block_free_email_invitation ON public.invitations;
CREATE TRIGGER trg_block_free_email_invitation BEFORE INSERT OR UPDATE OF email, status ON public.invitations
FOR EACH ROW WHEN (NEW.status = 'pending') EXECUTE FUNCTION public.block_free_email_invitation();

-- Preserve deployed business logic; patch only nullable denial predicates.
DO $patch$
DECLARE f record; old_definition text; new_definition text;
BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN (
 'create_organization_invitation','cancel_organization_invitation','resend_organization_invitation',
 'manage_organization_member','manage_sop_department_member','assign_org_permission_role',
 'create_org_permission_role','set_org_permission_grant','set_org_permission_override',
 'merge_employee_records','clone_pilgrimage_sale')
 LOOP
  old_definition := pg_get_functiondef(f.oid);
  new_definition := replace(old_definition, 'v_actor_role NOT IN', 'COALESCE(v_actor_role::text, '''') NOT IN');
  new_definition := replace(new_definition, 'v_role NOT IN', 'COALESCE(v_role, '''') NOT IN');
  new_definition := replace(new_definition,
   'public.get_user_org_role(auth.uid(), v_invite.organization_id) NOT IN',
   'COALESCE(public.get_user_org_role(auth.uid(), v_invite.organization_id)::text, '''') NOT IN');
  new_definition := replace(new_definition,
   'public.get_user_org_role(auth.uid(), _org_id) NOT IN',
   'COALESCE(public.get_user_org_role(auth.uid(), _org_id)::text, '''') NOT IN');
  new_definition := replace(new_definition,
   'public.get_user_org_role(auth.uid(),old_sale.organization_id)::text',
   'COALESCE(public.get_user_org_role(auth.uid(),old_sale.organization_id)::text, '''')');
  -- Text comparisons retain the exact existing role allowlist.
  new_definition := replace(new_definition, '''owner''::public.org_role, ''admin''::public.org_role', '''owner'', ''admin''');
  IF new_definition = old_definition THEN
   RAISE EXCEPTION 'Expected authorization predicate not found in %',f.proname;
  END IF;
  EXECUTE new_definition;
 END LOOP;
END $patch$;

-- The browser is not the trust boundary: enforce verification and work email in RPCs.
DO $patch$
DECLARE f record; old_definition text; new_definition text; guard text;
BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('accept_invitation','create_organization_onboarding')
 LOOP
  old_definition := pg_get_functiondef(f.oid);
  guard := E'BEGIN\n  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL AND NOT public.is_free_email(u.email)) THEN\n    RAISE EXCEPTION ''يجب تأكيد بريد العمل الرسمي قبل إنشاء المؤسسة أو قبول الدعوة'' USING ERRCODE=''42501'';\n  END IF;\n';
  IF f.proname='create_organization_onboarding' THEN
   guard := guard || E'  IF public.is_free_email(_email) THEN\n    RAISE EXCEPTION ''التسجيل مخصص للشركات فقط. يرجى استخدام بريد العمل الرسمي.'' USING ERRCODE=''22023'';\n  END IF;\n';
  ELSE
   guard := guard || E'  IF EXISTS (SELECT 1 FROM public.invitations WHERE token=_token AND public.is_free_email(email)) THEN\n    RAISE EXCEPTION ''دعوات الموظفين تتطلب بريد عمل رسمي'' USING ERRCODE=''22023'';\n  END IF;\n';
  END IF;
  new_definition := replace(old_definition,E'BEGIN\n',guard);
  IF new_definition=old_definition THEN RAISE EXCEPTION 'Expected function entry not found in %',f.proname; END IF;
  EXECUTE new_definition;
 END LOOP;
END $patch$;

-- A membership may be edited, never transplanted between tenants or users.
CREATE OR REPLACE FUNCTION public.guard_membership_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id THEN
  RAISE EXCEPTION 'Membership identity and organization are immutable' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_membership_identity ON public.organization_members;
CREATE TRIGGER trg_guard_membership_identity BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.guard_membership_identity();
REVOKE ALL ON FUNCTION public.block_free_email_invitation(), public.guard_membership_identity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_free_email(text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.is_free_email(text) FROM PUBLIC,anon;