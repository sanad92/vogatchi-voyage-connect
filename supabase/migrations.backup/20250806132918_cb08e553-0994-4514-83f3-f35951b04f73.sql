-- Phase 1: Critical RLS fixes - tighten overly permissive policies

-- 1) hotel_bookings: remove permissive ALL policy and add scoped policies
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for hotel_bookings" ON public.hotel_bookings;

-- View: privileged roles can view all, agents can view their own
CREATE POLICY "Bookings: view own or privileged"
ON public.hotel_bookings
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  booking_agent_id = auth.uid()
);

-- Insert: admins/managers/super admins can insert; agents can insert only for themselves
CREATE POLICY "Bookings: insert scoped"
ON public.hotel_bookings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  booking_agent_id = auth.uid()
);

-- Update: admins/managers/super admins can update; agents only their own
CREATE POLICY "Bookings: update scoped"
ON public.hotel_bookings
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  booking_agent_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  booking_agent_id = auth.uid()
);

-- Keep existing super_admin-only DELETE etc. policies as extra guardrails


-- 2) invoice_items: remove permissive ALL policy and restrict access
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON public.invoice_items;

-- View: only accountants and privileged roles
CREATE POLICY "Invoice items: view by finance roles"
ON public.invoice_items
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
);

-- Insert/Update/Delete: finance roles only
CREATE POLICY "Invoice items: manage by finance roles"
ON public.invoice_items
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
);


-- 3) payment_orders: remove permissive ALL policy and restrict to finance roles
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON public.payment_orders;

CREATE POLICY "Payment orders: finance roles manage"
ON public.payment_orders
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
);


-- 4) booking_statuses: lookup table - allow read for authenticated, manage by super_admin
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for booking_statuses" ON public.booking_statuses;

CREATE POLICY "Booking statuses: read for authenticated"
ON public.booking_statuses
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Booking statuses: manage by super_admin"
ON public.booking_statuses
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));


-- 5) permission_groups: only super_admin can manage; read by super_admin (used in admin UI)
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for permission_groups" ON public.permission_groups;

CREATE POLICY "Permission groups: read by super_admin"
ON public.permission_groups
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Permission groups: manage by super_admin"
ON public.permission_groups
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));


-- 6) detailed_permissions: only super_admin may access
ALTER TABLE public.detailed_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for detailed_permissions" ON public.detailed_permissions;

CREATE POLICY "Detailed permissions: read by super_admin"
ON public.detailed_permissions
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Detailed permissions: manage by super_admin"
ON public.detailed_permissions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));


-- 7) system_settings: remove permissive policy if present (already has scoped ones)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for system_settings" ON public.system_settings;
-- Keep existing: "Super admins can manage all settings" and "Users can view public settings"


-- 8) invoice_sequences: restrict to finance roles
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for now" ON public.invoice_sequences;

CREATE POLICY "Invoice sequences: read by finance roles"
ON public.invoice_sequences
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "Invoice sequences: manage by super_admin"
ON public.invoice_sequences
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));


-- 9) permission: ensure RLS is enabled where missing
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;