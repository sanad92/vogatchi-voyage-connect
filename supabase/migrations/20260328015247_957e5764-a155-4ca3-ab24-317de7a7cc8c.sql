CREATE TABLE public.bank_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  transfer_reference text,
  receipt_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Org members can view their own requests
CREATE POLICY "org_members_view_transfers" ON public.bank_transfer_requests
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Org owner/admin can create requests
CREATE POLICY "org_admin_create_transfers" ON public.bank_transfer_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Platform admins can view all and update
CREATE POLICY "platform_admin_view_all_transfers" ON public.bank_transfer_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform_admin_update_transfers" ON public.bank_transfer_requests
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE INDEX idx_bank_transfer_requests_org ON public.bank_transfer_requests(organization_id);
CREATE INDEX idx_bank_transfer_requests_status ON public.bank_transfer_requests(status);