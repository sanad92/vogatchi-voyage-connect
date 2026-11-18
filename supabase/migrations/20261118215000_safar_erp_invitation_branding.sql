-- Use the same verified sender configuration as the platform Auth email hook.
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

  v_link := 'https://safarerp.com/accept-invite?token=' || v_invite.token::text;
  v_text := format(
    'دعاك %s للانضمام إلى %s بدور %s. افتح الرابط خلال 7 أيام: %s',
    COALESCE(v_inviter_name, 'مدير المؤسسة'),
    v_org_name,
    v_role_label,
    v_link
  );

  v_html := format(
    '<!doctype html><html dir="rtl"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e6e9f0;border-radius:16px;overflow:hidden"><div style="padding:24px 28px;background:#14213d;color:#fff"><h1 style="margin:0;font-size:24px">دعوة للانضمام إلى Safar ERP</h1></div><div style="padding:28px"><p style="font-size:16px;line-height:1.8">دعاك <strong>%s</strong> للانضمام إلى <strong>%s</strong> بدور <strong>%s</strong>.</p><p style="font-size:14px;color:#5d667a">الرابط صالح لمدة 7 أيام، وستختار كلمة مرور حسابك بنفسك.</p><p style="margin:28px 0"><a href="%s" style="display:inline-block;background:#2f6fed;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700">قبول الدعوة</a></p><p style="font-size:12px;color:#7b8497;word-break:break-all">إذا لم يعمل الزر، انسخ الرابط التالي:<br>%s</p></div></div></body></html>',
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
      'from', 'Safar ERP <noreply@safarerp.com>',
      'sender_domain', 'notify.safarerp.com',
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
