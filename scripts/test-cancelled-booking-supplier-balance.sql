-- Rejected unpaid supplier order linked to a cancelled booking.
INSERT INTO public.supplier_payment_orders
  (id, organization_id, supplier_id, booking_id, reference_number, amount, currency, approval_status, status)
VALUES
  (fixture_id(650),fixture_id(1),fixture_id(201),fixture_id(324),'PO-CANCELLED',107460,'EGP','rejected','pending'),
  (fixture_id(651),fixture_id(1),fixture_id(201),fixture_id(324),'PO-ACTIVE',10,'EGP','approved','approved'),
  (fixture_id(652),fixture_id(1),fixture_id(201),fixture_id(323),'PO-OTHER',25,'EGP','rejected','pending');
ALTER TABLE public.bookings ADD COLUMN selling_price numeric DEFAULT 0,
  ADD COLUMN cost_price numeric DEFAULT 107460, ADD COLUMN profit numeric DEFAULT -107460,
  ADD COLUMN customer_name text, ADD COLUMN supplier_name text;
CREATE TABLE public.expense_transactions (id uuid, booking_id uuid, transaction_number text,
  transaction_date date, description text, amount numeric, status text, currency text);
CREATE TABLE public.employee_commissions (id uuid, booking_id uuid, commission_date date,
  commission_amount numeric, commission_rate numeric, payment_status text, currency text);
SET test.user_id = '00000000-0000-0000-0000-000000000010';

SELECT fixture_assert((get_booking_profit_cockpit(fixture_id(324)) #>> '{summary,supplier_remaining}')::numeric = 10,
  'live supplier invoice remains due even when a different order was rejected');
UPDATE public.supplier_payment_orders SET approval_status='rejected' WHERE id=fixture_id(651);
SELECT fixture_assert((get_booking_profit_cockpit(fixture_id(324)) #>> '{summary,supplier_remaining}')::numeric = 107460,
  'a rejected but reopenable order does not establish a final supplier cancellation');
UPDATE public.supplier_payment_orders SET status='cancelled' WHERE id IN (fixture_id(650), fixture_id(651));
SELECT fixture_assert((get_booking_profit_cockpit(fixture_id(324)) #>> '{summary,supplier_remaining}')::numeric = 0,
  'confirmed supplier cancellation must not fall back to original booking cost');
SELECT fixture_assert(get_booking_profit_cockpit(fixture_id(324)) #>> '{summary,supplier_due_basis}' = 'cancelled_supplier_invoices',
  'cancelled supplier documents must be distinguished from estimates');
SELECT fixture_assert((get_booking_profit_cockpit(fixture_id(323)) #>> '{summary,supplier_remaining}')::numeric = 107460,
  'active booking still uses its estimate in absence of an active invoice');
