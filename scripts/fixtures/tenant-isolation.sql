-- Isolated regression fixture: deployed pre-hardening function definitions and tenant policies.

CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;

CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);

GRANT USAGE ON SCHEMA auth TO authenticated,service_role;

CREATE TYPE public.account_type AS ENUM ('{','a','s','s','e','t',',','l','i','a','b','i','l','i','t','y',',','e','q','u','i','t','y',',','r','e','v','e','n','u','e',',','e','x','p','e','n','s','e','}');

CREATE TYPE public.booking_workflow_stage AS ENUM ('{','l','e','a','d',',','q','u','a','l','i','f','i','e','d',',','q','u','o','t','e','d',',','c','o','n','f','i','r','m','e','d',',','p','a','i','d',',','o','p','e','r','a','t','i','o','n','s',',','t','r','a','v','e','l','i','n','g',',','c','o','m','p','l','e','t','e','d',',','p','o','s','t','_','t','r','a','v','e','l',',','c','a','n','c','e','l','l','e','d','}');

CREATE TYPE public.document_category AS ENUM ('{','p','a','s','s','p','o','r','t',',','v','i','s','a',',','v','o','u','c','h','e','r',',','i','n','v','o','i','c','e',',','p','u','r','c','h','a','s','e','_','o','r','d','e','r',',','t','i','c','k','e','t',',','i','n','s','u','r','a','n','c','e',',','c','o','n','t','r','a','c','t',',','o','t','h','e','r','}');

CREATE TYPE public.org_role AS ENUM ('{','o','w','n','e','r',',','a','d','m','i','n',',','m','a','n','a','g','e','r',',','a','g','e','n','t',',','v','i','e','w','e','r','}');

CREATE TYPE public.platform_role AS ENUM ('{','p','l','a','t','f','o','r','m','_','a','d','m','i','n',',','p','l','a','t','f','o','r','m','_','o','w','n','e','r','}');

CREATE TYPE public.sop_approval_status AS ENUM ('{','p','e','n','d','i','n','g',',','a','p','p','r','o','v','e','d',',','r','e','j','e','c','t','e','d','}');

CREATE TYPE public.sop_approval_type AS ENUM ('{','d','i','s','c','o','u','n','t',',','f','r','e','e','_','s','e','r','v','i','c','e',',','b','o','o','k','i','n','g','_','c','o','n','f','i','r','m','a','t','i','o','n',',','s','u','p','p','l','i','e','r','_','p','a','y','m','e','n','t',',','r','e','f','u','n','d','_','c','o','m','p','e','n','s','a','t','i','o','n','}');

CREATE TYPE public.sop_deadline_type AS ENUM ('{','p','a','y','m','e','n','t',',','c','a','n','c','e','l','l','a','t','i','o','n',',','r','e','l','e','a','s','e',',','p','r','e','_','a','r','r','i','v','a','l',',','r','e','c','o','n','f','i','r','m','a','t','i','o','n','}');

CREATE TYPE public.sop_department AS ENUM ('{','c','u','s','t','o','m','e','r','_','s','e','r','v','i','c','e',',','s','a','l','e','s',',','r','e','s','e','r','v','a','t','i','o','n','s',',','o','p','e','r','a','t','i','o','n','s',',','m','a','n','a','g','e','m','e','n','t',',','m','a','r','k','e','t','i','n','g',',','f','i','n','a','n','c','e','}');

CREATE TYPE public.sop_handover_type AS ENUM ('{','c','s','_','t','o','_','s','a','l','e','s',',','s','a','l','e','s','_','t','o','_','r','e','s','e','r','v','a','t','i','o','n','s',',','r','e','s','e','r','v','a','t','i','o','n','s','_','t','o','_','s','a','l','e','s',',','r','e','s','e','r','v','a','t','i','o','n','s','_','t','o','_','c','s','}');

CREATE TYPE public.sop_lead_stage AS ENUM ('{','n','e','w',',','q','u','a','l','i','f','i','e','d',',','a','s','s','i','g','n','e','d',',','p','r','i','c','i','n','g','_','r','e','q','u','e','s','t','e','d',',','q','u','o','t','e','d',',','f','o','l','l','o','w','_','u','p',',','a','c','c','e','p','t','e','d','_','p','e','n','d','i','n','g','_','r','e','c','h','e','c','k',',','r','e','c','h','e','c','k','e','d',',','p','a','y','m','e','n','t','_','p','e','n','d','i','n','g',',','w','o','n',',','l','o','s','t',',','c','a','n','c','e','l','l','e','d','}');

CREATE TYPE public.sop_pricing_status AS ENUM ('{','r','e','q','u','e','s','t','e','d',',','i','n','_','p','r','o','g','r','e','s','s',',','q','u','o','t','e','d',',','r','e','q','u','o','t','e','d',',','r','e','c','h','e','c','k',',','c','l','o','s','e','d',',','c','a','n','c','e','l','l','e','d','}');

CREATE TABLE public.admin_audit_log ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid,"action" text,"target_table" text,"target_id" uuid,"details" jsonb,"ip_address" text,"created_at" timestamp with time zone,"organization_id" uuid,"old_values" jsonb,"new_values" jsonb,"user_email" text,"entity_name" text);

CREATE TABLE public.employee_merge_audit ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"kept_employee_id" uuid,"merged_employee_ids" uuid[],"merged_by" uuid,"created_at" timestamp with time zone);

CREATE TABLE public.employees ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"employee_code" text,"full_name" text,"position" text,"department" text,"phone" text,"email" text,"national_id" text,"hire_date" date,"salary_scale_level" integer,"base_salary" numeric(12,2),"allowances" numeric(12,2),"commission_rate" numeric(5,2),"commission_type" text,"total_commission_earned" numeric(12,2),"is_active" boolean,"bank_account_number" text,"bank_name" text,"emergency_contact_name" text,"emergency_contact_phone" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"organization_id" uuid);

CREATE TABLE public.invitations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"email" text,"role" org_role,"token" uuid DEFAULT gen_random_uuid(),"invited_by" uuid,"status" text DEFAULT 'pending',"expires_at" timestamp with time zone DEFAULT now()+interval '7 days',"accepted_at" timestamp with time zone,"created_at" timestamp with time zone);

CREATE TABLE public.organization_members ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"user_id" uuid,"role" org_role,"is_active" boolean DEFAULT true,"joined_at" timestamp with time zone,"branch_id" uuid,"department_id" uuid);

CREATE TABLE public.organization_permission_overrides ("organization_id" uuid,"user_id" uuid,"permission_key" text,"granted" boolean,"data_scope" text,"reason" text,"updated_by" uuid,"updated_at" timestamp with time zone);

CREATE TABLE public.organization_permission_role_assignments ("organization_id" uuid,"user_id" uuid,"role_id" uuid,"assigned_by" uuid,"created_at" timestamp with time zone);

CREATE TABLE public.organization_permission_role_grants ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"role_id" uuid,"permission_key" text,"granted" boolean,"data_scope" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);

CREATE TABLE public.organization_permission_roles ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"name" text,"description" text,"inherits_base_role" boolean,"is_active" boolean,"created_by" uuid,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);

CREATE TABLE public.organizations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"name" text,"slug" text,"logo_url" text,"phone" text,"email" text,"address" text,"plan" text,"plan_expires_at" timestamp with time zone,"max_users" integer,"is_active" boolean,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"onboarding_completed" boolean,"has_demo_data" boolean,"tax_number" text,"commercial_registration" text,"zatca_enabled" boolean);

CREATE TABLE public.pilgrimage_sale_item_costs ("item_id" uuid,"organization_id" uuid,"unit_cost" numeric(14,2),"supplier_id" uuid,"cost_notes" text,"updated_at" timestamp with time zone);

CREATE TABLE public.pilgrimage_sale_items ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"sale_id" uuid,"item_kind" text,"description" text,"room_type" text,"quantity" numeric(12,2),"unit_sell" numeric(14,2),"line_sell" numeric(16,2),"notes" text,"created_at" timestamp with time zone);

CREATE TABLE public.pilgrimage_sale_travelers ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"sale_id" uuid,"customer_id" uuid,"pilgrim_id" uuid,"display_name" text,"room_type" text,"created_at" timestamp with time zone);

CREATE TABLE public.pilgrimage_sales ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"program_type" text,"sale_model" text,"fulfillment_role" text,"status" text,"name" text,"program_id" uuid,"buyer_customer_id" uuid,"buyer_agency_id" uuid,"upstream_supplier_id" uuid,"supersedes_sale_id" uuid,"party_size" integer,"currency" text,"departure_date" date,"return_date" date,"notes" text,"created_by" uuid,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);

CREATE TABLE public.profiles ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"full_name" text,"email" text,"phone" text,"is_active" boolean,"employee_id" text,"department" text,"position" text,"hire_date" date,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"linked_employee_id" uuid);

CREATE TABLE public.sop_department_members ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organization_id" uuid,"user_id" uuid,"department" sop_department,"is_available" boolean,"specializations" text[],"last_assigned_at" timestamp with time zone,"active_load" integer,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);

CREATE TABLE platform_roles(user_id uuid,role platform_role);

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(organization_id), '{}')
  FROM public.organization_members
  WHERE user_id = _user_id AND is_active = true
$function$


CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id uuid, _org_id uuid)
 RETURNS org_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
  LIMIT 1
$function$


CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin'::platform_role, 'platform_owner'::platform_role)
  );
$function$


CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.user_id = _user_id
      AND m.organization_id = _org_id
      AND m.is_active = true
  );
$function$


CREATE FUNCTION public.queue_organization_invitation_email(uuid) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invitations%ROWTYPE;
  v_membership public.organization_members%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = _token AND status = 'pending'
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الدعوة غير موجودة أو تم استخدامها');
  END IF;

  IF v_invite.expires_at <= now() THEN
    UPDATE public.invitations SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية الدعوة');
  END IF;

  IF v_invite.role = 'owner'::public.org_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'الدعوة تحتوي على دور غير مسموح');
  END IF;

  SELECT lower(email) INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS DISTINCT FROM lower(v_invite.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني لا يتطابق مع الدعوة');
  END IF;

  SELECT * INTO v_membership
  FROM public.organization_members
  WHERE organization_id = v_invite.organization_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF v_membership.id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_invite.organization_id, v_user_id, v_invite.role, true);
  ELSIF NOT v_membership.is_active THEN
    UPDATE public.organization_members
    SET role = v_invite.role,
        is_active = true
    WHERE id = v_membership.id;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  INSERT INTO public.admin_audit_log (
    organization_id, user_id, action, target_table, target_id, details
  ) VALUES (
    v_invite.organization_id,
    v_user_id,
    'organization_invitation_accepted',
    'invitations',
    v_invite.id,
    jsonb_build_object('role', v_invite.role)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_membership.id IS NOT NULL AND v_membership.is_active
      THEN 'أنت عضو بالفعل في هذه المؤسسة'
      ELSE 'تم قبول الدعوة بنجاح'
    END,
    'organization_id', v_invite.organization_id
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.assign_org_permission_role(_org_id uuid, _user_id uuid, _role_id uuid, _assigned boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can assign permission roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.is_active) THEN
    RAISE EXCEPTION 'User is not an active member of this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_roles r WHERE r.id = _role_id AND r.organization_id = _org_id AND r.is_active) THEN
    RAISE EXCEPTION 'Role does not belong to this organization';
  END IF;
  IF COALESCE(_assigned, true) THEN
    INSERT INTO public.organization_permission_role_assignments (organization_id, user_id, role_id, assigned_by)
    VALUES (_org_id, _user_id, _role_id, auth.uid())
    ON CONFLICT (organization_id, user_id, role_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by;
  ELSE
    DELETE FROM public.organization_permission_role_assignments
    WHERE organization_id = _org_id AND user_id = _user_id AND role_id = _role_id;
  END IF;
END;
$function$


CREATE OR REPLACE FUNCTION public.cancel_organization_invitation(_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE id = _invitation_id
  FOR UPDATE;

  IF v_invite.id IS NULL THEN RAISE EXCEPTION 'الدعوة غير موجودة'; END IF;

  IF NOT public.is_platform_admin(auth.uid())
     AND public.get_user_org_role(auth.uid(), v_invite.organization_id) NOT IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإلغاء الدعوة';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'يمكن إلغاء الدعوات المعلقة فقط';
  END IF;

  UPDATE public.invitations SET status = 'cancelled' WHERE id = v_invite.id;

  INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, target_id, old_values, new_values)
  VALUES (
    v_invite.organization_id, auth.uid(), 'organization_invitation_cancelled',
    'invitations', v_invite.id,
    jsonb_build_object('status', v_invite.status),
    jsonb_build_object('status', 'cancelled')
  );

  RETURN jsonb_build_object('success', true);
END;
$function$


CREATE OR REPLACE FUNCTION public.clone_pilgrimage_sale(_sale_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  old_sale public.pilgrimage_sales%ROWTYPE;
  new_sale_id uuid;
  old_item public.pilgrimage_sale_items%ROWTYPE;
  new_item_id uuid;
  old_cost public.pilgrimage_sale_item_costs%ROWTYPE;
  t public.pilgrimage_sale_travelers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO old_sale FROM public.pilgrimage_sales
    WHERE id=_sale_id;
  IF NOT FOUND OR
    public.get_user_org_role(auth.uid(),old_sale.organization_id)::text
       NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'quote_not_found_or_not_authorized' USING ERRCODE='42501';
  END IF;
  IF old_sale.status<>'quoted' THEN
    RAISE EXCEPTION 'only_issued_quotes_can_be_revised' USING ERRCODE='22023'; END IF;

  INSERT INTO public.pilgrimage_sales(
    organization_id,program_type,sale_model,fulfillment_role,status,name,
    program_id,buyer_customer_id,buyer_agency_id,upstream_supplier_id,
    supersedes_sale_id,party_size,currency,departure_date,return_date,notes,
    created_by
  ) VALUES (
    old_sale.organization_id,old_sale.program_type,old_sale.sale_model,
    old_sale.fulfillment_role,'draft',old_sale.name,
    old_sale.program_id,old_sale.buyer_customer_id,old_sale.buyer_agency_id,
    old_sale.upstream_supplier_id,old_sale.id,old_sale.party_size,
    old_sale.currency,old_sale.departure_date,old_sale.return_date,
    old_sale.notes,auth.uid()
  ) RETURNING id INTO new_sale_id;

  FOR old_item IN SELECT * FROM public.pilgrimage_sale_items
    WHERE sale_id=old_sale.id
  LOOP
    INSERT INTO public.pilgrimage_sale_items(
      organization_id,sale_id,item_kind,description,room_type,
      quantity,unit_sell,notes
    ) VALUES (
      old_sale.organization_id,new_sale_id,old_item.item_kind,
      old_item.description,old_item.room_type,old_item.quantity,
      old_item.unit_sell,old_item.notes
    ) RETURNING id INTO new_item_id;
    SELECT * INTO old_cost FROM public.pilgrimage_sale_item_costs
      WHERE item_id=old_item.id;
    IF FOUND THEN
      INSERT INTO public.pilgrimage_sale_item_costs(
        item_id,organization_id,unit_cost,supplier_id,cost_notes
      ) VALUES (
        new_item_id,old_sale.organization_id,old_cost.unit_cost,
        old_cost.supplier_id,old_cost.cost_notes
      );
    END IF;
  END LOOP;

  FOR t IN SELECT * FROM public.pilgrimage_sale_travelers
    WHERE sale_id=old_sale.id
  LOOP
    INSERT INTO public.pilgrimage_sale_travelers(
      organization_id,sale_id,customer_id,pilgrim_id,display_name,room_type
    ) VALUES (
      old_sale.organization_id,new_sale_id,t.customer_id,t.pilgrim_id,
      t.display_name,t.room_type
    );
  END LOOP;
  RETURN new_sale_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.create_org_permission_role(_org_id uuid, _name text, _description text DEFAULT NULL::text, _inherits_base_role boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can manage permission roles' USING ERRCODE = '42501';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 THEN
    RAISE EXCEPTION 'Role name is required';
  END IF;
  INSERT INTO public.organization_permission_roles
    (organization_id, name, description, inherits_base_role, created_by)
  VALUES (_org_id, btrim(_name), NULLIF(btrim(_description), ''), COALESCE(_inherits_base_role, false), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.create_organization_invitation(_organization_id uuid, _email text, _role org_role DEFAULT 'agent'::org_role)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_role public.org_role;
  v_email text := lower(trim(COALESCE(_email, '')));
  v_invite public.invitations%ROWTYPE;
  v_queue_id bigint;
BEGIN
  v_actor_role := public.get_user_org_role(auth.uid(), _organization_id);

  IF NOT public.is_platform_admin(auth.uid())
     AND v_actor_role NOT IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإرسال الدعوات';
  END IF;

  IF length(v_email) > 255
     OR v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'البريد الإلكتروني غير صالح';
  END IF;

  IF _role = 'owner'::public.org_role THEN
    RAISE EXCEPTION 'لا يمكن منح دور المالك من خلال دعوة';
  END IF;

  IF v_actor_role = 'admin'::public.org_role AND _role = 'admin'::public.org_role THEN
    RAISE EXCEPTION 'المالك فقط يمكنه دعوة مدير آخر';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    JOIN auth.users AS au ON au.id = om.user_id
    WHERE om.organization_id = _organization_id
      AND om.is_active = true
      AND lower(au.email) = v_email
  ) THEN
    RAISE EXCEPTION 'هذا المستخدم عضو نشط في المؤسسة بالفعل';
  END IF;

  UPDATE public.invitations
  SET status = 'expired'
  WHERE organization_id = _organization_id
    AND lower(email) = v_email
    AND status = 'pending'
    AND expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE organization_id = _organization_id
      AND lower(email) = v_email
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'توجد دعوة معلقة بالفعل لهذا البريد';
  END IF;

  INSERT INTO public.invitations (
    organization_id, email, role, invited_by, status, expires_at
  ) VALUES (
    _organization_id,
    v_email,
    _role,
    auth.uid(),
    'pending',
    now() + interval '7 days'
  )
  RETURNING * INTO v_invite;

  v_queue_id := public.queue_organization_invitation_email(v_invite.id);

  INSERT INTO public.admin_audit_log (
    organization_id, user_id, action, target_table, target_id, new_values, details
  ) VALUES (
    _organization_id,
    auth.uid(),
    'organization_invitation_created',
    'invitations',
    v_invite.id,
    jsonb_build_object('email', v_email, 'role', _role, 'expires_at', v_invite.expires_at),
    jsonb_build_object('queue_id', v_queue_id)
  );

  RETURN to_jsonb(v_invite) || jsonb_build_object('email_queued', true);
END;
$function$


CREATE OR REPLACE FUNCTION public.create_organization_onboarding(_name text, _slug text DEFAULT NULL::text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF length(trim(COALESCE(_name, ''))) < 2 OR length(trim(_name)) > 120 THEN
    RAISE EXCEPTION 'اسم المؤسسة يجب أن يكون بين 2 و120 حرفاً';
  END IF;

  IF _email IS NOT NULL
     AND trim(_email) <> ''
     AND lower(trim(_email)) !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'البريد الإلكتروني للمؤسسة غير صالح';
  END IF;

  IF NOT public.is_platform_admin(v_user_id)
     AND EXISTS (
       SELECT 1 FROM public.organization_members
       WHERE user_id = v_user_id AND is_active = true
     ) THEN
    RAISE EXCEPTION 'الحساب مرتبط بمؤسسة نشطة بالفعل';
  END IF;

  v_slug := trim(both '-' FROM regexp_replace(lower(trim(COALESCE(_slug, ''))), '[^a-z0-9-]+', '-', 'g'));
  IF length(v_slug) < 3 THEN
    v_slug := 'org-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;
  v_slug := left(v_slug, 63);

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) THEN
    v_slug := left(v_slug, 54) || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  INSERT INTO public.organizations (name, slug, phone, email, address, plan)
  VALUES (
    trim(_name),
    v_slug,
    NULLIF(trim(_phone), ''),
    NULLIF(lower(trim(_email)), ''),
    NULLIF(trim(_address), ''),
    'trial'
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
  VALUES (v_org_id, v_user_id, 'owner'::public.org_role, true);

  INSERT INTO public.admin_audit_log (
    organization_id, user_id, action, target_table, target_id, new_values, details
  ) VALUES (
    v_org_id,
    v_user_id,
    'organization_created',
    'organizations',
    v_org_id,
    jsonb_build_object('name', trim(_name), 'slug', v_slug, 'plan', 'trial'),
    jsonb_build_object('source', 'create_organization_onboarding')
  );

  RETURN v_org_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.guard_organization_member_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'owner'::public.org_role THEN
      IF NOT NEW.is_active THEN
        RAISE EXCEPTION 'مالك المؤسسة يجب أن يكون نشطاً';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = NEW.organization_id
      ) THEN
        RAISE EXCEPTION 'لا يمكن إضافة مالك آخر للمؤسسة';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner'::public.org_role
       AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'لا يمكن حذف مالك المؤسسة';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'owner'::public.org_role
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'لا يمكن تغيير أو إيقاف مالك المؤسسة';
  END IF;

  IF NEW.role = 'owner'::public.org_role AND OLD.role <> 'owner'::public.org_role THEN
    IF current_user NOT IN ('postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'تعيين المالك متاح فقط من مسار نقل الملكية المعتمد';
    END IF;
    IF NOT NEW.is_active THEN
      RAISE EXCEPTION 'مالك المؤسسة يجب أن يكون نشطاً';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.manage_organization_member(_membership_id uuid, _new_role org_role DEFAULT NULL::org_role, _is_active boolean DEFAULT NULL::boolean, _termination_date date DEFAULT NULL::date, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target public.organization_members%ROWTYPE;
  v_actor_role public.org_role;
  v_platform boolean;
  v_employee_id uuid;
  v_next_role public.org_role;
  v_next_active boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT * INTO v_target
  FROM public.organization_members
  WHERE id = _membership_id
  FOR UPDATE;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'العضو غير موجود';
  END IF;

  v_actor_role := public.get_user_org_role(auth.uid(), v_target.organization_id);
  v_platform := public.is_platform_admin(auth.uid());

  IF NOT v_platform AND v_actor_role NOT IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإدارة أعضاء المؤسسة';
  END IF;

  IF v_target.user_id = auth.uid() AND NOT v_platform THEN
    RAISE EXCEPTION 'لا يمكنك تغيير دورك أو إيقاف عضويتك بنفسك';
  END IF;

  IF v_target.role = 'owner'::public.org_role THEN
    RAISE EXCEPTION 'لا يمكن تعديل مالك المؤسسة من إدارة الفريق';
  END IF;

  IF _new_role = 'owner'::public.org_role THEN
    RAISE EXCEPTION 'تعيين المالك غير متاح من إدارة الفريق';
  END IF;

  IF NOT v_platform AND v_actor_role = 'admin'::public.org_role THEN
    IF v_target.role = 'admin'::public.org_role OR _new_role = 'admin'::public.org_role THEN
      RAISE EXCEPTION 'المدير لا يمكنه إدارة مدير آخر أو منح دور المدير';
    END IF;
  END IF;

  v_next_role := COALESCE(_new_role, v_target.role);
  v_next_active := COALESCE(_is_active, v_target.is_active);

  UPDATE public.organization_members
  SET role = v_next_role,
      is_active = v_next_active
  WHERE id = v_target.id;

  IF v_target.is_active = true AND v_next_active = false THEN
    SELECT linked_employee_id INTO v_employee_id
    FROM public.profiles
    WHERE id = v_target.user_id;

    IF v_employee_id IS NOT NULL THEN
      UPDATE public.employees
      SET is_active = false,
          updated_at = now()
      WHERE id = v_employee_id
        AND organization_id = v_target.organization_id;
    END IF;
  END IF;

  INSERT INTO public.admin_audit_log (
    organization_id, user_id, action, target_table, target_id,
    old_values, new_values, details
  ) VALUES (
    v_target.organization_id,
    auth.uid(),
    CASE
      WHEN v_target.is_active AND NOT v_next_active THEN 'member_offboarded'
      WHEN NOT v_target.is_active AND v_next_active THEN 'member_reactivated'
      WHEN v_target.role IS DISTINCT FROM v_next_role THEN 'member_role_changed'
      ELSE 'member_updated'
    END,
    'organization_members',
    v_target.id,
    jsonb_build_object('role', v_target.role, 'is_active', v_target.is_active),
    jsonb_build_object('role', v_next_role, 'is_active', v_next_active),
    jsonb_build_object(
      'target_user_id', v_target.user_id,
      'termination_date', _termination_date,
      'note', left(NULLIF(trim(_note), ''), 500),
      'employee_id', v_employee_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'membership_id', v_target.id,
    'role', v_next_role,
    'is_active', v_next_active
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.manage_sop_department_member(_organization_id uuid, _user_id uuid, _department sop_department, _assign boolean DEFAULT true, _is_available boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_role public.org_role;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_actor_role := public.get_user_org_role(auth.uid(), _organization_id);
  IF NOT public.is_platform_admin(auth.uid())
     AND v_actor_role NOT IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإدارة الأقسام';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'المستخدم ليس عضواً نشطاً في المؤسسة';
  END IF;

  SELECT to_jsonb(d) INTO v_old
  FROM public.sop_department_members AS d
  WHERE d.organization_id = _organization_id
    AND d.user_id = _user_id
    AND d.department = _department;

  IF _assign THEN
    INSERT INTO public.sop_department_members (
      organization_id, user_id, department, is_available
    ) VALUES (
      _organization_id, _user_id, _department, COALESCE(_is_available, true)
    )
    ON CONFLICT (organization_id, user_id, department)
    DO UPDATE SET
      is_available = EXCLUDED.is_available,
      updated_at = now()
    RETURNING to_jsonb(sop_department_members.*) INTO v_new;
  ELSE
    DELETE FROM public.sop_department_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND department = _department;
    v_new := NULL;
  END IF;

  INSERT INTO public.admin_audit_log (
    organization_id, user_id, action, target_table, target_id, old_values, new_values, details
  ) VALUES (
    _organization_id,
    auth.uid(),
    CASE WHEN _assign THEN 'sop_department_member_assigned' ELSE 'sop_department_member_removed' END,
    'sop_department_members',
    _user_id,
    v_old,
    v_new,
    jsonb_build_object('department', _department)
  );

  RETURN jsonb_build_object('success', true, 'assigned', _assign, 'department', _department);
END;
$function$


CREATE OR REPLACE FUNCTION public.merge_employee_records(_keep_id uuid, _merge_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_org uuid; v_role text; v_fk record; v_count integer:=0; v_changed integer;
BEGIN
  IF auth.uid() IS NULL OR _keep_id IS NULL OR coalesce(array_length(_merge_ids,1),0)=0 OR _keep_id=ANY(_merge_ids) THEN
    RAISE EXCEPTION 'Invalid employee merge request';
  END IF;
  SELECT organization_id INTO v_org FROM public.employees WHERE id=_keep_id AND coalesce(is_active,true) FOR UPDATE;
  IF v_org IS NULL OR EXISTS(SELECT 1 FROM public.employees WHERE id=ANY(_merge_ids) AND organization_id IS DISTINCT FROM v_org) OR
     (SELECT count(*) FROM public.employees WHERE id=ANY(_merge_ids))<>array_length(_merge_ids,1) THEN RAISE EXCEPTION 'Employees must exist in the same organization'; END IF;
  SELECT role::text INTO v_role FROM public.organization_members WHERE organization_id=v_org AND user_id=auth.uid() AND is_active=true;
  IF v_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Only organization owners or admins can merge employees' USING ERRCODE='42501'; END IF;

  FOR v_fk IN
    SELECT ns.nspname AS schema_name,cl.relname AS table_name,att.attname AS column_name
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class cl ON cl.oid=con.conrelid
    JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY ck(attnum,ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY fk(attnum,ord) USING(ord)
    JOIN pg_catalog.pg_attribute att ON att.attrelid=con.conrelid AND att.attnum=ck.attnum
    JOIN pg_catalog.pg_attribute ratt ON ratt.attrelid=con.confrelid AND ratt.attnum=fk.attnum
    WHERE con.contype='f' AND con.confrelid='public.employees'::regclass AND ratt.attname='id'
      AND NOT (ns.nspname='public' AND cl.relname='employee_merge_audit')
  LOOP
    EXECUTE format('UPDATE %I.%I SET %I=$1 WHERE %I=ANY($2)',v_fk.schema_name,v_fk.table_name,v_fk.column_name,v_fk.column_name)
      USING _keep_id,_merge_ids;
    GET DIAGNOSTICS v_changed=ROW_COUNT; v_count:=v_count+v_changed;
  END LOOP;
  UPDATE public.employees SET is_active=false,updated_at=now() WHERE id=ANY(_merge_ids);
  INSERT INTO public.employee_merge_audit(organization_id,kept_employee_id,merged_employee_ids,merged_by)
  VALUES(v_org,_keep_id,_merge_ids,auth.uid());
  RETURN jsonb_build_object('success',true,'kept_employee_id',_keep_id,'merged_employee_ids',_merge_ids,'references_updated',v_count);
END;
$function$


CREATE OR REPLACE FUNCTION public.resend_organization_invitation(_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invitations%ROWTYPE;
  v_queue_id bigint;
BEGIN
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE id = _invitation_id
  FOR UPDATE;

  IF v_invite.id IS NULL THEN RAISE EXCEPTION 'الدعوة غير موجودة'; END IF;

  IF NOT public.is_platform_admin(auth.uid())
     AND public.get_user_org_role(auth.uid(), v_invite.organization_id) NOT IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإعادة إرسال الدعوة';
  END IF;

  IF v_invite.status = 'accepted' THEN
    RAISE EXCEPTION 'لا يمكن إعادة إرسال دعوة مقبولة';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE organization_id = v_invite.organization_id
      AND lower(email) = lower(v_invite.email)
      AND status = 'pending'
      AND id <> v_invite.id
  ) THEN
    RAISE EXCEPTION 'توجد دعوة معلقة أحدث لهذا البريد';
  END IF;

  UPDATE public.invitations
  SET status = 'pending',
      accepted_at = NULL,
      expires_at = now() + interval '7 days',
      token = gen_random_uuid()
  WHERE id = v_invite.id
  RETURNING * INTO v_invite;

  v_queue_id := public.queue_organization_invitation_email(v_invite.id);

  INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, target_id, details)
  VALUES (
    v_invite.organization_id, auth.uid(), 'organization_invitation_resent',
    'invitations', v_invite.id, jsonb_build_object('queue_id', v_queue_id)
  );

  RETURN to_jsonb(v_invite) || jsonb_build_object('email_queued', true);
END;
$function$


CREATE OR REPLACE FUNCTION public.set_org_permission_grant(_org_id uuid, _role_id uuid, _permission_key text, _granted boolean, _data_scope text DEFAULT 'organization'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can manage permission roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_roles r WHERE r.id = _role_id AND r.organization_id = _org_id) THEN
    RAISE EXCEPTION 'Role does not belong to this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_catalog c WHERE c.permission_key = _permission_key AND c.is_active) THEN
    RAISE EXCEPTION 'Unknown permission key';
  END IF;
  IF _data_scope NOT IN ('none', 'own', 'team', 'branch', 'organization') THEN
    RAISE EXCEPTION 'Invalid data scope';
  END IF;
  INSERT INTO public.organization_permission_role_grants
    (organization_id, role_id, permission_key, granted, data_scope)
  VALUES (_org_id, _role_id, _permission_key, COALESCE(_granted, false),
          CASE WHEN COALESCE(_granted, false) THEN _data_scope ELSE 'none' END)
  ON CONFLICT (role_id, permission_key) DO UPDATE SET
    granted = EXCLUDED.granted,
    data_scope = EXCLUDED.data_scope,
    updated_at = now();
END;
$function$


CREATE OR REPLACE FUNCTION public.set_org_permission_override(_org_id uuid, _user_id uuid, _permission_key text, _granted boolean, _data_scope text DEFAULT 'organization'::text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can override permissions' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.is_active) THEN
    RAISE EXCEPTION 'User is not an active member of this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_catalog c WHERE c.permission_key = _permission_key AND c.is_active) THEN
    RAISE EXCEPTION 'Unknown permission key';
  END IF;
  IF _data_scope NOT IN ('none', 'own', 'team', 'branch', 'organization') THEN
    RAISE EXCEPTION 'Invalid data scope';
  END IF;
  INSERT INTO public.organization_permission_overrides
    (organization_id, user_id, permission_key, granted, data_scope, reason, updated_by)
  VALUES (_org_id, _user_id, _permission_key, COALESCE(_granted, false),
          CASE WHEN COALESCE(_granted, false) THEN _data_scope ELSE 'none' END,
          NULLIF(btrim(_reason), ''), auth.uid())
  ON CONFLICT (organization_id, user_id, permission_key) DO UPDATE SET
    granted = EXCLUDED.granted,
    data_scope = EXCLUDED.data_scope,
    reason = EXCLUDED.reason,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$function$


GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admins_can_read_invitations" ON public.invitations FOR SELECT TO authenticated USING (((get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])) OR is_platform_admin(auth.uid())));

CREATE POLICY "om_delete_non_owner" ON public.organization_members FOR DELETE TO authenticated USING (((role <> 'owner'::org_role) AND ((get_user_org_role(auth.uid(), organization_id) = 'owner'::org_role) OR is_platform_admin(auth.uid()))));

CREATE POLICY "om_insert_by_role_hierarchy" ON public.organization_members FOR INSERT TO authenticated WITH CHECK ((is_platform_admin(auth.uid()) OR ((get_user_org_role(auth.uid(), organization_id) = 'owner'::org_role) AND (role <> 'owner'::org_role)) OR ((get_user_org_role(auth.uid(), organization_id) = 'admin'::org_role) AND (role = ANY (ARRAY['manager'::org_role, 'agent'::org_role, 'viewer'::org_role])))));

CREATE POLICY "om_select_active_self_or_org" ON public.organization_members FOR SELECT TO authenticated USING ((((user_id = auth.uid()) AND (is_active = true)) OR (organization_id = ANY (get_user_org_ids(auth.uid()))) OR is_platform_admin(auth.uid())));

CREATE POLICY "om_update_by_role_hierarchy" ON public.organization_members FOR UPDATE TO authenticated USING ((is_platform_admin(auth.uid()) OR (get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))) WITH CHECK ((is_platform_admin(auth.uid()) OR ((get_user_org_role(auth.uid(), organization_id) = 'owner'::org_role) AND (role <> 'owner'::org_role)) OR ((get_user_org_role(auth.uid(), organization_id) = 'admin'::org_role) AND (role = ANY (ARRAY['manager'::org_role, 'agent'::org_role, 'viewer'::org_role])))));

CREATE POLICY "Allow insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));

CREATE POLICY "Platform admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));

CREATE POLICY "profiles_select_org_admins" ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (organization_members om_self
     JOIN organization_members om_target ON ((om_target.organization_id = om_self.organization_id)))
  WHERE ((om_self.user_id = auth.uid()) AND (om_self.is_active = true) AND (om_self.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'manager'::org_role])) AND (om_target.user_id = profiles.id) AND (om_target.is_active = true) AND (om_target.organization_id = om_self.organization_id)))));

REVOKE INSERT,UPDATE,DELETE ON public.invitations FROM authenticated;