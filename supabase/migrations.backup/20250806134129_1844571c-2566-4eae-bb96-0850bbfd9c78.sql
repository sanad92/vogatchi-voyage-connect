-- Secure SECURITY DEFINER functions by fixing mutable search_path
-- This migration sets search_path to 'public' for all SECURITY DEFINER functions we use,
-- mitigating search_path hijacking per Supabase linter rule 0011.

-- 1) Role/permission helpers
ALTER FUNCTION public.get_current_user_role()
  SET search_path = public;

ALTER FUNCTION public.check_user_permission(uuid, text, text)
  SET search_path = public;

ALTER FUNCTION public.get_permission_groups()
  SET search_path = public;

ALTER FUNCTION public.get_detailed_permissions()
  SET search_path = public;

ALTER FUNCTION public.get_all_user_permissions()
  SET search_path = public;

ALTER FUNCTION public.get_user_permissions(uuid)
  SET search_path = public;

ALTER FUNCTION public.update_user_permissions(uuid, jsonb)
  SET search_path = public;

ALTER FUNCTION public.create_default_user_permissions()
  SET search_path = public;

ALTER FUNCTION public.create_default_permissions(uuid)
  SET search_path = public;

ALTER FUNCTION public.create_default_detailed_permissions()
  SET search_path = public;

-- 2) Employee linking and admin helpers
ALTER FUNCTION public.link_user_to_employee(uuid, uuid)
  SET search_path = public;

ALTER FUNCTION public.unlink_user_from_employee(uuid)
  SET search_path = public;

ALTER FUNCTION public.toggle_employee_status(uuid, boolean, text)
  SET search_path = public;

ALTER FUNCTION public.safe_delete_employee(uuid, boolean, text)
  SET search_path = public;

ALTER FUNCTION public.check_employee_deletion(uuid)
  SET search_path = public;

-- 3) WhatsApp and messaging helpers
ALTER FUNCTION public.update_message_status(text, text, timestamp with time zone)
  SET search_path = public;

ALTER FUNCTION public.update_whatsapp_updated_at()
  SET search_path = public;

-- 4) Booking and invoices helpers
ALTER FUNCTION public.update_customer_last_follow_up()
  SET search_path = public;

ALTER FUNCTION public.set_customer_created_by()
  SET search_path = public;

ALTER FUNCTION public.calculate_booking_values()
  SET search_path = public;

ALTER FUNCTION public.calculate_flight_booking_values()
  SET search_path = public;

ALTER FUNCTION public.update_booking_status(uuid, uuid, uuid, text)
  SET search_path = public;

ALTER FUNCTION public.get_current_booking_status(uuid)
  SET search_path = public;

ALTER FUNCTION public.generate_booking_number()
  SET search_path = public;

-- 5) Finance and salary helpers
ALTER FUNCTION public.calculate_net_salary()
  SET search_path = public;

ALTER FUNCTION public.update_budget_remaining()
  SET search_path = public;

ALTER FUNCTION public.update_bank_account_balance()
  SET search_path = public;

ALTER FUNCTION public.get_current_exchange_rate(text, text)
  SET search_path = public;

ALTER FUNCTION public.update_invoice_multi_currency()
  SET search_path = public;

ALTER FUNCTION public.calculate_payment_order_amount()
  SET search_path = public;

ALTER FUNCTION public.calculate_monthly_salary(uuid, date, numeric, numeric, numeric, text)
  SET search_path = public;

-- 6) Generic updated_at trigger
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;
