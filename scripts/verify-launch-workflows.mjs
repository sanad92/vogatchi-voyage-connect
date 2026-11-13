import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { importKey, importRecordId, previewCompanyImport } from '../src/lib/companyDataImport.ts';

const preview = previewCompanyImport('customers', [
  ['اسم العميل', 'رقم الهاتف', 'organization_id'],
  ['Example', '٠١٠ ١٢٣٤٥٦٧٨', 'foreign-org'],
  ['example', '01012345678', 'foreign-org'],
]);
assert.equal(preview.errors.length, 0);
assert.deepEqual(preview.duplicates, [3]);
assert.deepEqual(preview.rows[0].record, { name: 'Example', phone: '٠١٠ ١٢٣٤٥٦٧٨' });
assert.equal(preview.rows[0].key, importKey('customers', { name: 'example', phone: '01012345678' }));
const id = await importRecordId('org-1', 'customers', preview.rows[0].key);
assert.equal(id, await importRecordId('org-1', 'customers', preview.rows[0].key));
assert.notEqual(id, await importRecordId('org-2', 'customers', preview.rows[0].key));
assert.match(id, /^[\da-f-]{36}$/);
assert.equal(previewCompanyImport('suppliers', [['name', 'type', 'نوع المورد'], ['Supplier', 'hotel', 'hotel']]).errors.length, 1);
assert.equal(previewCompanyImport('employees', [['full_name', 'employee_code'], ['Employee', '']]).errors.length, 1);
console.log('Import preview, duplicate identities, row validation and organization scope passed.');

const db = new PGlite();
const uid = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const [org, foreign, user, booking, order, invoice] = [1, 2, 3, 4, 5, 6].map(uid);
await db.exec(`
  CREATE SCHEMA auth;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT current_setting(''qa.actor'', true)::uuid';
  CREATE FUNCTION public.can_process_org_payments(uuid) RETURNS boolean LANGUAGE sql
    AS 'SELECT $1 = ''${org}'' AND auth.uid() = ''${user}''';
  CREATE FUNCTION public._org_permission_state(uuid, uuid, text)
    RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql
    AS 'SELECT $1 = ''${org}'' AND $2 = ''${user}'' AND $3 = ''payments_process'', current_setting(''qa.scope'', true)';
  CREATE TABLE bookings(id uuid PRIMARY KEY, organization_id uuid, status text, workflow_stage text, is_demo boolean);
  CREATE TABLE supplier_payment_orders(id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status text,
    pilgrimage_b2b_agreement_id uuid, approval_status text, rejection_reason text, approved_by uuid,
    approved_at timestamptz, updated_at timestamptz, supplier_id uuid, amount numeric, currency text,
    due_date date, reference_number text, created_at timestamptz);
  CREATE TABLE supplier_invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_order_id uuid, organization_id uuid,
    booking_id uuid, amount_paid numeric, status text, notes text, supplier_id uuid, amount numeric, currency text,
    invoice_number text, invoice_date date, due_date date, exchange_rate numeric, amount_base numeric,
    created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz);
  CREATE TABLE supplier_payment_allocations(payment_order_id uuid, supplier_invoice_id uuid);
  CREATE TABLE refund_balance_settlements(supplier_order_id uuid);
  CREATE TABLE journal_entries(organization_id uuid, is_locked boolean, source_type text, source_id uuid);
  INSERT INTO bookings VALUES ('${booking}', '${org}', 'confirmed', 'confirmed', false);
  INSERT INTO supplier_payment_orders(id, booking_id, organization_id, status, approval_status, supplier_id, amount, currency)
    VALUES ('${order}', '${booking}', '${org}', 'approved', 'approved', '${uid(7)}', 50000, 'EGP');
  INSERT INTO supplier_invoices(id, payment_order_id, organization_id, booking_id, amount_paid, status, notes, exchange_rate)
    VALUES ('${invoice}', '${order}', '${org}', '${booking}', 0, 'unpaid', '[AUTO_FROM_PAYMENT_ORDER]', 1);
`);
const migration = readFileSync('supabase/migrations/20260904100616_booking_supplier_payable_integrity.sql', 'utf8');
await db.exec(migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.sync_supplier_invoice_from_payment_order'), migration.indexOf('CREATE OR REPLACE FUNCTION public.prepare_supplier_payment_allocation')));
await db.exec(readFileSync('supabase/migrations/20261113232530_close_unpaid_supplier_order.sql', 'utf8'));
const close = reference => db.query('SELECT public.close_unpaid_supplier_order($1, $2)', [order, reference]);
const asFinance = () => db.exec(`SET ROLE authenticated; SET qa.actor = '${user}'; SET qa.scope = 'organization'`);
await asFinance();
await assert.rejects(close('confirmation'), { code: '22023' });
await db.exec(`RESET ROLE; UPDATE bookings SET status = 'cancelled'; INSERT INTO refund_balance_settlements VALUES ('${order}')`);
await asFinance();
await assert.rejects(close('confirmation'), /تسوية/);
await db.exec(`RESET ROLE; DELETE FROM refund_balance_settlements;
  INSERT INTO journal_entries VALUES ('${org}', true, 'supplier_invoice', '${invoice}')`);
await asFinance();
await assert.rejects(close('confirmation'), /مقفل/);
await db.exec(`RESET ROLE; DELETE FROM journal_entries; UPDATE bookings SET organization_id = '${foreign}'`);
await asFinance();
await assert.rejects(close('confirmation'), { code: '42501' });
await db.exec(`RESET ROLE; UPDATE bookings SET organization_id = '${org}'`);
await asFinance();
await db.exec("SET qa.scope = 'own'");
await assert.rejects(close('confirmation'), { code: '42501' });
await asFinance();
await assert.rejects(close(' '), { code: '22023' });
await close('supplier email ref');
await close('second call');
await db.exec('RESET ROLE');
assert.deepEqual((await db.query('SELECT status, rejection_reason FROM supplier_payment_orders')).rows, [
  { status: 'cancelled', rejection_reason: 'supplier email ref' },
]);
assert.deepEqual((await db.query('SELECT status FROM supplier_invoices')).rows, [{ status: 'cancelled' }]);
await db.close();
console.log('Supplier closure passed eligibility, tenant scope, restricted finance scope, locked journals, settlement protection and replay checks.');
