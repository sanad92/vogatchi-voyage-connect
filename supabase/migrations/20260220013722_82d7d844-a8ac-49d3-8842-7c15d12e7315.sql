
-- ==========================================
-- Phase 1: Core Multi-tenancy Infrastructure
-- ==========================================

-- 1. Create org_role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'manager', 'agent', 'viewer');

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_bookings_per_month INTEGER NOT NULL DEFAULT 100,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 5. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  activated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Security Definer function to get user's org IDs (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(organization_id), '{}')
  FROM public.organization_members
  WHERE user_id = _user_id AND is_active = true
$$;

-- 7. Function to check if user belongs to an org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
  )
$$;

-- 8. Function to check user's role in org
CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id UUID, _org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true
  LIMIT 1
$$;

-- 9. RLS Policies for organizations
CREATE POLICY "Users can view their own organizations"
ON public.organizations FOR SELECT TO authenticated
USING (id = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update their own organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (id = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (true);

-- 10. RLS Policies for organization_members
CREATE POLICY "Users can view members of their orgs"
ON public.organization_members FOR SELECT TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org owners/admins can manage members"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
);

CREATE POLICY "Org owners/admins can update members"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE POLICY "Org owners can delete members"
ON public.organization_members FOR DELETE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) = 'owner');

-- 11. RLS for subscription_plans (public read)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT TO authenticated
USING (true);

-- 12. RLS for subscriptions
CREATE POLICY "Users can view their org subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- 13. Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Insert default subscription plans
-- INSERT INTO public.subscription_plans (name, name_ar, price_monthly, price_yearly, max_users, max_bookings_per_month, features) VALUES
-- ('Free', 'مجاني', 0, 0, 2, 20, '["basic_crm", "hotel_bookings"]'::jsonb),
-- ('Basic', 'أساسي', 299, 2990, 5, 100, '["basic_crm", "hotel_bookings", "flight_bookings", "invoices", "reports"]'::jsonb),
-- ('Pro', 'احترافي', 599, 5990, 15, 500, '["basic_crm", "hotel_bookings", "flight_bookings", "car_rentals", "transport", "invoices", "reports", "marketing", "commissions"]'::jsonb),
-- ('Enterprise', 'مؤسسات', 999, 9990, 50, 9999, '["all_features"]'::jsonb);

-- 15. Add organization_id to ALL business tables
-- Batch 1: Core business tables
ALTER TABLE public.customers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.hotel_bookings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.flight_bookings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.car_rentals ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.transport_bookings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.invoice_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.employees ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.suppliers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Batch 2: Financial tables
ALTER TABLE public.bank_accounts ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.bank_account_transactions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expense_transactions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expense_categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.exchange_rates ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.commission_payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.employee_commissions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.employee_commission_periods ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Batch 3: CRM & Communication tables
ALTER TABLE public.customer_communications ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customer_follow_ups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customer_notes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customer_satisfaction ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customer_segments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.campaign_sends ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.marketing_campaigns ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.loyalty_points ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.loyalty_rewards ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Batch 4: Booking related tables
ALTER TABLE public.booking_special_requests ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.booking_status_history ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.hotels ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.hotel_suppliers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.destinations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.airlines ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.airports ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.flight_classes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Batch 5: System & Admin tables
ALTER TABLE public.admin_audit_log ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.backup_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.forms ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.form_fields ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.form_submissions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.content_blocks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.blocks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 16. Now update ALL RLS policies to be org-scoped
-- Drop old permissive policies and create new ones

-- customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Org members can manage customers" ON public.customers FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- hotel_bookings
DROP POLICY IF EXISTS "Authenticated users can manage hotel_bookings" ON public.hotel_bookings;
CREATE POLICY "Org members can manage hotel_bookings" ON public.hotel_bookings FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- flight_bookings
DROP POLICY IF EXISTS "Authenticated users can manage flight_bookings" ON public.flight_bookings;
CREATE POLICY "Org members can manage flight_bookings" ON public.flight_bookings FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- car_rentals
DROP POLICY IF EXISTS "Authenticated users can manage car_rentals" ON public.car_rentals;
CREATE POLICY "Org members can manage car_rentals" ON public.car_rentals FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- invoices
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
CREATE POLICY "Org members can manage invoices" ON public.invoices FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- invoice_items
DROP POLICY IF EXISTS "Authenticated users can manage invoice_items" ON public.invoice_items;
CREATE POLICY "Org members can manage invoice_items" ON public.invoice_items FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- employees
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
CREATE POLICY "Org members can manage employees" ON public.employees FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- suppliers
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
CREATE POLICY "Org members can manage suppliers" ON public.suppliers FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- bank_accounts
DROP POLICY IF EXISTS "Authenticated users can manage bank_accounts" ON public.bank_accounts;
CREATE POLICY "Org members can manage bank_accounts" ON public.bank_accounts FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- bank_account_transactions
DROP POLICY IF EXISTS "Authenticated users can manage bank_account_transactions" ON public.bank_account_transactions;
CREATE POLICY "Org members can manage bank_account_transactions" ON public.bank_account_transactions FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- expense_transactions
DROP POLICY IF EXISTS "Authenticated users can manage expense_transactions" ON public.expense_transactions;
CREATE POLICY "Org members can manage expense_transactions" ON public.expense_transactions FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- expense_categories
DROP POLICY IF EXISTS "Authenticated users can manage expense_categories" ON public.expense_categories;
CREATE POLICY "Org members can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- exchange_rates
DROP POLICY IF EXISTS "Authenticated users can manage exchange_rates" ON public.exchange_rates;
CREATE POLICY "Org members can manage exchange_rates" ON public.exchange_rates FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- commission_payments
DROP POLICY IF EXISTS "Authenticated users can manage commission_payments" ON public.commission_payments;
CREATE POLICY "Org members can manage commission_payments" ON public.commission_payments FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- employee_commissions
DROP POLICY IF EXISTS "Authenticated users can manage employee_commissions" ON public.employee_commissions;
CREATE POLICY "Org members can manage employee_commissions" ON public.employee_commissions FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- employee_commission_periods
DROP POLICY IF EXISTS "Authenticated users can manage employee_commission_periods" ON public.employee_commission_periods;
CREATE POLICY "Org members can manage employee_commission_periods" ON public.employee_commission_periods FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- customer_communications
DROP POLICY IF EXISTS "Authenticated users can manage customer_communications" ON public.customer_communications;
CREATE POLICY "Org members can manage customer_communications" ON public.customer_communications FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- customer_follow_ups
DROP POLICY IF EXISTS "Authenticated users can manage customer_follow_ups" ON public.customer_follow_ups;
CREATE POLICY "Org members can manage customer_follow_ups" ON public.customer_follow_ups FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- customer_notes
DROP POLICY IF EXISTS "Authenticated users can manage customer_notes" ON public.customer_notes;
CREATE POLICY "Org members can manage customer_notes" ON public.customer_notes FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- customer_satisfaction
DROP POLICY IF EXISTS "Authenticated users can manage customer_satisfaction" ON public.customer_satisfaction;
CREATE POLICY "Org members can manage customer_satisfaction" ON public.customer_satisfaction FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- customer_segments
DROP POLICY IF EXISTS "Authenticated users can manage customer_segments" ON public.customer_segments;
DROP POLICY IF EXISTS "Authenticated users can read customer_segments" ON public.customer_segments;
CREATE POLICY "Org members can manage customer_segments" ON public.customer_segments FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- campaign_sends
DROP POLICY IF EXISTS "Authenticated users can manage campaign_sends" ON public.campaign_sends;
CREATE POLICY "Org members can manage campaign_sends" ON public.campaign_sends FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- marketing_campaigns
DROP POLICY IF EXISTS "Authenticated users can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Org members can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- loyalty_points
DROP POLICY IF EXISTS "Authenticated users can manage loyalty_points" ON public.loyalty_points;
CREATE POLICY "Org members can manage loyalty_points" ON public.loyalty_points FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- loyalty_rewards
DROP POLICY IF EXISTS "Authenticated users can manage loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "Org members can manage loyalty_rewards" ON public.loyalty_rewards FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- booking_special_requests
DROP POLICY IF EXISTS "Authenticated users can manage booking_special_requests" ON public.booking_special_requests;
CREATE POLICY "Org members can manage booking_special_requests" ON public.booking_special_requests FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- booking_status_history
DROP POLICY IF EXISTS "Authenticated users can manage booking_status_history" ON public.booking_status_history;
CREATE POLICY "Org members can manage booking_status_history" ON public.booking_status_history FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- hotels
DROP POLICY IF EXISTS "Authenticated users can manage hotels" ON public.hotels;
CREATE POLICY "Org members can manage hotels" ON public.hotels FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- hotel_suppliers
DROP POLICY IF EXISTS "Authenticated users can manage hotel_suppliers" ON public.hotel_suppliers;
CREATE POLICY "Org members can manage hotel_suppliers" ON public.hotel_suppliers FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- destinations
DROP POLICY IF EXISTS "Authenticated users can manage destinations" ON public.destinations;
CREATE POLICY "Org members can manage destinations" ON public.destinations FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- airlines
DROP POLICY IF EXISTS "Authenticated users can manage airlines" ON public.airlines;
CREATE POLICY "Org members can manage airlines" ON public.airlines FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- airports
DROP POLICY IF EXISTS "Authenticated users can manage airports" ON public.airports;
CREATE POLICY "Org members can manage airports" ON public.airports FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- flight_classes
DROP POLICY IF EXISTS "Authenticated users can manage flight_classes" ON public.flight_classes;
CREATE POLICY "Org members can manage flight_classes" ON public.flight_classes FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- admin_audit_log
DROP POLICY IF EXISTS "Authenticated users can manage admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "Org members can manage admin_audit_log" ON public.admin_audit_log FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- backup_logs
DROP POLICY IF EXISTS "Authenticated users can manage backup_logs" ON public.backup_logs;
CREATE POLICY "Org members can manage backup_logs" ON public.backup_logs FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- forms
DROP POLICY IF EXISTS "Authenticated users can manage forms" ON public.forms;
CREATE POLICY "Org members can manage forms" ON public.forms FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- form_fields
DROP POLICY IF EXISTS "Authenticated users can manage form_fields" ON public.form_fields;
CREATE POLICY "Org members can manage form_fields" ON public.form_fields FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- form_submissions
DROP POLICY IF EXISTS "Authenticated users can manage form_submissions" ON public.form_submissions;
CREATE POLICY "Org members can manage form_submissions" ON public.form_submissions FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- content_blocks
DROP POLICY IF EXISTS "Authenticated users can manage content_blocks" ON public.content_blocks;
CREATE POLICY "Org members can manage content_blocks" ON public.content_blocks FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- blocks
DROP POLICY IF EXISTS "Authenticated users can manage blocks" ON public.blocks;
CREATE POLICY "Org members can manage blocks" ON public.blocks FOR ALL TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));

-- 17. Create indexes for organization_id on all tables for performance
CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_hotel_bookings_org ON public.hotel_bookings(organization_id);
CREATE INDEX idx_flight_bookings_org ON public.flight_bookings(organization_id);
CREATE INDEX idx_car_rentals_org ON public.car_rentals(organization_id);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_employees_org ON public.employees(organization_id);
CREATE INDEX idx_bank_accounts_org ON public.bank_accounts(organization_id);
CREATE INDEX idx_expense_transactions_org ON public.expense_transactions(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
