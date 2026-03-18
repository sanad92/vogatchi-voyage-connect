
-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'agent',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email, status)
);

CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage invitations"
  ON public.invitations FOR ALL
  USING (organization_id = ANY (get_user_org_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Anyone can read invitation by token"
  ON public.invitations FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  SELECT * INTO v_invite FROM public.invitations
  WHERE token = _token AND status = 'pending'
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الدعوة غير موجودة أو تم استخدامها');
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.invitations SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية الدعوة');
  END IF;

  IF (SELECT email FROM auth.users WHERE id = v_user_id) != v_invite.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني لا يتطابق مع الدعوة');
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = v_invite.organization_id AND user_id = v_user_id AND is_active = true) THEN
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'message', 'أنت عضو بالفعل في هذه المؤسسة', 'organization_id', v_invite.organization_id);
  END IF;
-- INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
--   VALUES (v_invite.organization_id, v_user_id, v_invite.role, true);

  UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'message', 'تم قبول الدعوة بنجاح', 'organization_id', v_invite.organization_id);
END;
$$;
