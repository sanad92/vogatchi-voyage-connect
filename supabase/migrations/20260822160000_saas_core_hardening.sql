-- SaaS core launch hardening:
-- - active-membership RLS
-- - paid-only organization onboarding
-- - role/seat integrity
-- - invitation-only team onboarding with transactional email
-- - audited department assignments
-- - reliable email/subscription maintenance jobs

-- ---------------------------------------------------------------------------
-- Departments used by the permission model
-- ---------------------------------------------------------------------------

ALTER TYPE public.sop_department ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.sop_department ADD VALUE IF NOT EXISTS 'finance';

-- ---------------------------------------------------------------------------
-- Membership helpers must never authorize an inactive/offboarded member
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.user_id = _user_id
      AND m.organization_id = _org_id
      AND m.is_active = true
  );
$function$;

REVOKE ALL ON FUNCTION public.user_belongs_to_org(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(uuid, uuid) TO authenticated, service_role;

-- An inactive user must not be able to read their own membership row and use
-- it as a bridge through policies on other tables. Active org administrators
-- can still see inactive rows for offboarding/history.
DROP POLICY IF EXISTS "om_select_self_or_org" ON public.organization_members;
CREATE POLICY "om_select_active_self_or_org"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() AND is_active = true)
  OR organization_id = ANY (public.get_user_org_ids(auth.uid()))
  OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "om_insert_owner_or_first" ON public.organization_members;
CREATE POLICY "om_insert_by_role_hierarchy"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (
    public.get_user_org_role(auth.uid(), organization_id) = 'owner'::public.org_role
    AND role <> 'owner'::public.org_role
  )
  OR (
    public.get_user_org_role(auth.uid(), organization_id) = 'admin'::public.org_role
    AND role IN ('manager'::public.org_role, 'agent'::public.org_role, 'viewer'::public.org_role)
  )
);

DROP POLICY IF EXISTS "om_update_admin" ON public.organization_members;
CREATE POLICY "om_update_by_role_hierarchy"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.get_user_org_role(auth.uid(), organization_id) IN ('owner'::public.org_role, 'admin'::public.org_role)
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (
    public.get_user_org_role(auth.uid(), organization_id) = 'owner'::public.org_role
    AND role <> 'owner'::public.org_role
  )
  OR (
    public.get_user_org_role(auth.uid(), organization_id) = 'admin'::public.org_role
    AND role IN ('manager'::public.org_role, 'agent'::public.org_role, 'viewer'::public.org_role)
  )
);

DROP POLICY IF EXISTS "om_delete_owner" ON public.organization_members;
CREATE POLICY "om_delete_non_owner"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  role <> 'owner'::public.org_role
  AND (
    public.get_user_org_role(auth.uid(), organization_id) = 'owner'::public.org_role
    OR public.is_platform_admin(auth.uid())
  )
);

-- There must be exactly one active owner per organization. Existing production
-- data was validated before this migration.
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_active_owner_idx
ON public.organization_members (organization_id)
WHERE role = 'owner'::public.org_role AND is_active = true;

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
$function$;

DROP TRIGGER IF EXISTS trg_guard_organization_member_integrity ON public.organization_members;
CREATE TRIGGER trg_guard_organization_member_integrity
BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.guard_organization_member_integrity();

-- Serialize seat allocation per organization and enforce limits on INSERT and
-- inactive -> active reactivation. The previous trigger covered INSERT only.
CREATE OR REPLACE FUNCTION public.enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  IF NOT NEW.is_active
     OR (TG_OP = 'UPDATE' AND OLD.is_active = true) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.organization_id::text, 918273));

  SELECT pl.max_users
  INTO v_max
  FROM public.subscriptions AS s
  JOIN public.subscription_plans AS pl ON pl.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
    AND (
      s.expires_at IS NULL
      OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now()
    )
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'لا يوجد اشتراك نشط لهذه المؤسسة. يرجى تفعيل اشتراك أولاً.';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_current
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND is_active = true;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'تم الوصول للحد الأقصى من المستخدمين (%). يرجى ترقية الخطة.', v_max;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit ON public.organization_members;
CREATE TRIGGER trg_enforce_user_limit
BEFORE INSERT OR UPDATE OF is_active ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_limit();

-- ---------------------------------------------------------------------------
-- Paid-only organization onboarding and legacy snapshot repair
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ALTER COLUMN plan SET DEFAULT 'trial';

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
REVOKE INSERT ON public.organizations FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  _name text,
  _slug text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _address text DEFAULT NULL
)
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
$function$;

REVOKE ALL ON FUNCTION public.create_organization_onboarding(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_onboarding(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_assign_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id
  INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = 'Pro' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id
    INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
      AND price_monthly > 0
    ORDER BY price_monthly DESC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'لا توجد خطة مدفوعة نشطة لبدء الفترة التجريبية';
  END IF;

  INSERT INTO public.subscriptions (
    organization_id, plan_id, status, starts_at, expires_at, notes
  ) VALUES (
    NEW.id,
    v_plan_id,
    'trialing',
    now(),
    now() + interval '14 days',
    'فترة تجريبية لمدة 14 يوماً على خطة مدفوعة'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_subscription_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_name text;
  v_max_users integer;
  v_expires_at timestamptz;
BEGIN
  SELECT lower(sp.name), sp.max_users, s.expires_at
  INTO v_plan_name, v_max_users, v_expires_at
  FROM public.subscriptions AS s
  JOIN public.subscription_plans AS sp ON sp.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
  ORDER BY
    CASE WHEN s.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    s.created_at DESC
  LIMIT 1;

  UPDATE public.organizations
  SET plan = COALESCE(v_plan_name, 'trial'),
      max_users = COALESCE(v_max_users, max_users),
      plan_expires_at = v_expires_at,
      updated_at = now()
  WHERE id = NEW.organization_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_organization_subscription_snapshot ON public.subscriptions;
CREATE TRIGGER trg_sync_organization_subscription_snapshot
AFTER INSERT OR UPDATE OF plan_id, status, expires_at ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_organization_subscription_snapshot();

-- Reconcile stale statuses and the legacy organization columns without
-- deleting any historical subscription rows.
UPDATE public.subscriptions
SET status = 'expired', updated_at = now()
WHERE status IN ('active', 'trialing')
  AND expires_at IS NOT NULL
  AND expires_at + (COALESCE(grace_period_days, 2) || ' days')::interval <= now();

WITH latest AS (
  SELECT DISTINCT ON (s.organization_id)
    s.organization_id,
    lower(sp.name) AS plan_name,
    sp.max_users,
    s.expires_at
  FROM public.subscriptions AS s
  JOIN public.subscription_plans AS sp ON sp.id = s.plan_id
  ORDER BY
    s.organization_id,
    CASE WHEN s.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    s.created_at DESC
)
UPDATE public.organizations AS o
SET plan = latest.plan_name,
    max_users = latest.max_users,
    plan_expires_at = latest.expires_at,
    updated_at = now()
FROM latest
WHERE latest.organization_id = o.id;

-- ---------------------------------------------------------------------------
-- Audited, hierarchy-aware member management
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.manage_organization_member(
  _membership_id uuid,
  _new_role public.org_role DEFAULT NULL,
  _is_active boolean DEFAULT NULL,
  _termination_date date DEFAULT NULL,
  _note text DEFAULT NULL
)
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
$function$;

REVOKE ALL ON FUNCTION public.manage_organization_member(uuid, public.org_role, boolean, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_organization_member(uuid, public.org_role, boolean, date, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Invitation-only team onboarding
-- ---------------------------------------------------------------------------

UPDATE public.invitations
SET email = lower(trim(email));

UPDATE public.invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at <= now();

WITH duplicate_pending AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY organization_id, lower(email)
           ORDER BY created_at DESC, id DESC
         ) AS row_number
  FROM public.invitations
  WHERE status = 'pending'
)
UPDATE public.invitations AS i
SET status = 'cancelled'
FROM duplicate_pending AS d
WHERE d.id = i.id AND d.row_number > 1;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_organization_id_email_status_key;
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_unique_idx
ON public.invitations (token);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_email_idx
ON public.invitations (organization_id, lower(email))
WHERE status = 'pending';

DROP POLICY IF EXISTS "Org members can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org members can read org invitations" ON public.invitations;
CREATE POLICY "org_admins_can_read_invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  public.get_user_org_role(auth.uid(), organization_id) IN ('owner'::public.org_role, 'admin'::public.org_role)
  OR public.is_platform_admin(auth.uid())
);

REVOKE INSERT, UPDATE, DELETE ON public.invitations FROM authenticated;

CREATE OR REPLACE FUNCTION public.html_escape(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path TO ''
AS $function$
  SELECT replace(
           replace(
             replace(
               replace(
                 replace(_value, '&', '&amp;'),
                 '<', '&lt;'),
               '>', '&gt;'),
             '"', '&quot;'),
           '''', '&#39;');
$function$;

REVOKE ALL ON FUNCTION public.html_escape(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_organization_invitation_email(_invitation_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invitations%ROWTYPE;
  v_org_name text;
  v_inviter_name text;
  v_role_label text;
  v_link text;
  v_message_id uuid := gen_random_uuid();
  v_run_id uuid := gen_random_uuid();
  v_html text;
  v_text text;
BEGIN
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE id = _invitation_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'الدعوة غير موجودة';
  END IF;

  SELECT name INTO v_org_name
  FROM public.organizations
  WHERE id = v_invite.organization_id;

  SELECT COALESCE(NULLIF(trim(full_name), ''), email)
  INTO v_inviter_name
  FROM public.profiles
  WHERE id = v_invite.invited_by;

  v_role_label := CASE v_invite.role
    WHEN 'admin'::public.org_role THEN 'مدير'
    WHEN 'manager'::public.org_role THEN 'مشرف'
    WHEN 'agent'::public.org_role THEN 'موظف'
    ELSE 'مشاهد'
  END;

  v_link := 'https://vogatchi-voyage-connect.lovable.app/accept-invite?token=' || v_invite.token::text;
  v_text := format(
    'دعاك %s للانضمام إلى %s بدور %s. افتح الرابط خلال 7 أيام: %s',
    COALESCE(v_inviter_name, 'مدير المؤسسة'),
    v_org_name,
    v_role_label,
    v_link
  );

  v_html := format(
    '<!doctype html><html dir="rtl"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e6e9f0;border-radius:16px;overflow:hidden"><div style="padding:24px 28px;background:#14213d;color:#fff"><h1 style="margin:0;font-size:24px">دعوة للانضمام إلى Vogantra</h1></div><div style="padding:28px"><p style="font-size:16px;line-height:1.8">دعاك <strong>%s</strong> للانضمام إلى <strong>%s</strong> بدور <strong>%s</strong>.</p><p style="font-size:14px;color:#5d667a">الرابط صالح لمدة 7 أيام، وستختار كلمة مرور حسابك بنفسك.</p><p style="margin:28px 0"><a href="%s" style="display:inline-block;background:#2f6fed;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700">قبول الدعوة</a></p><p style="font-size:12px;color:#7b8497;word-break:break-all">إذا لم يعمل الزر، انسخ الرابط التالي:<br>%s</p></div></div></body></html>',
    public.html_escape(COALESCE(v_inviter_name, 'مدير المؤسسة')),
    public.html_escape(v_org_name),
    public.html_escape(v_role_label),
    v_link,
    v_link
  );

  RETURN public.enqueue_email(
    'auth_emails',
    jsonb_build_object(
      'run_id', v_run_id::text,
      'to', v_invite.email,
      'from', 'Vogantra <noreply@vogatchi.com>',
      'sender_domain', 'vogatchi.com',
      'subject', 'دعوة للانضمام إلى ' || v_org_name,
      'html', v_html,
      'text', v_text,
      'purpose', 'transactional',
      'label', 'organization_invitation',
      'idempotency_key', 'organization-invitation:' || v_invite.id::text || ':' || v_invite.token::text,
      'unsubscribe_token', NULL,
      'message_id', v_message_id::text,
      'queued_at', now()
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_organization_invitation_email(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_invitation(
  _organization_id uuid,
  _email text,
  _role public.org_role DEFAULT 'agent'::public.org_role
)
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
$function$;

REVOKE ALL ON FUNCTION public.create_organization_invitation(uuid, text, public.org_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_invitation(uuid, text, public.org_role) TO authenticated;

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
$function$;

REVOKE ALL ON FUNCTION public.cancel_organization_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_organization_invitation(uuid) TO authenticated;

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
$function$;

REVOKE ALL ON FUNCTION public.resend_organization_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resend_organization_invitation(uuid) TO authenticated;

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
$function$;

REVOKE ALL ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Department membership writes: owner/admin only and always audited
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "sop_department_members_org_read" ON public.sop_department_members;
DROP POLICY IF EXISTS "sop_department_members_org_update" ON public.sop_department_members;
DROP POLICY IF EXISTS "sop_department_members_org_write" ON public.sop_department_members;
DROP POLICY IF EXISTS "sop_dept_mgr_delete" ON public.sop_department_members;

CREATE POLICY "sop_department_members_active_org_read"
ON public.sop_department_members
FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.manage_sop_department_member(
  _organization_id uuid,
  _user_id uuid,
  _department public.sop_department,
  _assign boolean DEFAULT true,
  _is_available boolean DEFAULT true
)
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
$function$;

REVOKE ALL ON FUNCTION public.manage_sop_department_member(uuid, uuid, public.sop_department, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_sop_department_member(uuid, uuid, public.sop_department, boolean, boolean) TO authenticated;

-- Direct writes are disabled; sop_set_my_availability and the audited admin RPC
-- are SECURITY DEFINER and remain the supported paths.
REVOKE INSERT, UPDATE, DELETE ON public.sop_department_members FROM authenticated;

-- ---------------------------------------------------------------------------
-- Queue processor and lifecycle maintenance
-- ---------------------------------------------------------------------------

-- Do not suddenly deliver obsolete welcome messages that have been sitting in
-- the pre-PGMQ legacy queue for months.
UPDATE public.email_queue
SET status = 'failed',
    error_message = 'Expired legacy queue item; not delivered during SaaS core migration',
    updated_at = now()
WHERE status = 'pending'
  AND created_at < now() - interval '24 hours';

DO $block$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue-every-minute'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$block$;

SELECT cron.schedule(
  'process-email-queue-every-minute',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://gvozalurfthzxpuasplo.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'email_queue_service_role_key'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $job$
);

DO $block$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'reconcile-saas-expirations-hourly'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$block$;

SELECT cron.schedule(
  'reconcile-saas-expirations-hourly',
  '7 * * * *',
  $job$
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE status IN ('active', 'trialing')
      AND expires_at IS NOT NULL
      AND expires_at + (COALESCE(grace_period_days, 2) || ' days')::interval <= now();

    UPDATE public.invitations
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at <= now();
  $job$
);

