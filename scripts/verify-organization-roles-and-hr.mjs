import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const db = new PGlite();
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const exec = db.exec.bind(db);
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [orgA, orgB, owner, manager, agent, inactive, employeeA, employeeB] = [1, 2, 11, 12, 13, 14, 21, 22].map(id);
const otherOwner = id(15);

try {
  const fixture = sql('scripts/fixtures/tenant-isolation.sql');
  const core = fixture.slice(0, fixture.indexOf('CREATE OR REPLACE FUNCTION public.get_user_org_ids'));
  const memberships = fixture.slice(fixture.indexOf('CREATE OR REPLACE FUNCTION public.get_user_org_ids'), fixture.indexOf('CREATE OR REPLACE FUNCTION public.is_platform_admin'));
  await exec(core + memberships + `
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT false';
    CREATE FUNCTION public.user_belongs_to_org(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT $2 = ANY(public.get_user_org_ids($1))';
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), $1)';
    CREATE SCHEMA operations_private;
    ALTER TABLE public.organization_members ADD UNIQUE (organization_id, user_id);
    DROP TABLE public.organization_permission_overrides, public.organization_permission_role_assignments,
      public.organization_permission_role_grants, public.organization_permission_roles;
    CREATE TABLE public.monthly_salaries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid, organization_id uuid,
      salary_month text, base_salary numeric, allowances numeric, overtime_hours numeric,
      overtime_rate numeric, overtime_amount numeric, bonus numeric, deductions numeric, tax_amount numeric,
      insurance_deduction numeric, gross_salary numeric,
      net_salary numeric, net_salary_egp numeric, exchange_rate numeric, currency text, status text,
      notes text, created_by uuid, payment_date date, payment_method text, bank_account_id uuid,
      updated_at timestamptz
    );
    CREATE TABLE public.organization_salary_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, setting_key text, setting_value numeric
    );
    CREATE TABLE public.bank_accounts (
      id uuid PRIMARY KEY, organization_id uuid, currency text, is_active boolean, treasury_kind text,
      current_balance numeric NOT NULL DEFAULT 10000, updated_at timestamptz
    );
    CREATE TABLE public.bank_account_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bank_account_id uuid, transaction_type text, amount numeric, description text, transaction_date date,
      reference_number text, created_by uuid, organization_id uuid, source_type text, source_id uuid,
      currency text, UNIQUE(organization_id, source_type, source_id)
    );
    CREATE TABLE public.journal_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, entry_number text, entry_date date,
      reference_type text, reference_id uuid, description text, total_debit numeric, total_credit numeric,
      status text, created_by uuid, currency text, source_type text, source_id uuid, functional_currency text,
      fx_rate numeric, posted_at timestamptz, auto_generated boolean, is_locked boolean DEFAULT false,
      UNIQUE(organization_id, source_type, source_id)
    );
    CREATE TABLE public.journal_entry_lines (
      journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE, account_id uuid, debit numeric, credit numeric, description text, line_order integer
    );
    CREATE FUNCTION public._next_entry_number(uuid) RETURNS text LANGUAGE sql AS 'SELECT gen_random_uuid()::text';
    CREATE FUNCTION public._resolve_account(uuid, text) RETURNS uuid LANGUAGE sql AS $$
      SELECT CASE WHEN current_setting('test.reject_journal', true) = 'on' AND $2 IN ('1000', '1010') THEN NULL
                  ELSE ('10000000-0000-4000-8000-' || lpad($2, 12, '0'))::uuid END;
    $$;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees, public.monthly_salaries, public.organization_salary_settings TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_transactions TO authenticated;
    ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    CREATE POLICY test_employee_member ON public.employees FOR ALL TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));
    ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY test_salary_member ON public.monthly_salaries FOR ALL TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));
    ALTER TABLE public.organization_salary_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY test_salary_settings ON public.organization_salary_settings FOR ALL TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));
  `);
  await exec(sql('supabase/migrations/20260907143000_company_scoped_permissions.sql'));
  const dispatcher = sql('supabase/migrations/20261117192156_route_internal_notifications_to_staff.sql');
  await exec(dispatcher.slice(dispatcher.indexOf('DO $split_permission$'), dispatcher.indexOf('CREATE FUNCTION operations_private.notification_recipient')));
  await exec('GRANT EXECUTE ON FUNCTION public._org_permission_state(uuid,uuid,text) TO authenticated');
  await exec(sql('supabase/migrations/20261119112811_organization_role_defaults_and_hr.sql'));
  await exec(sql('supabase/migrations/20261119121105_guard_salary_payment_retries.sql'));
  await exec(sql('supabase/migrations/20261119230749_use_organization_overtime_settings.sql'));
  await exec(sql('scripts/fixtures/payroll-production-posting.sql'));
  await exec(`
    CREATE TRIGGER trg_normalize_salary_financials BEFORE INSERT OR UPDATE OF base_salary, allowances, overtime_hours,
      overtime_rate, overtime_amount, bonus, deductions, tax_amount, insurance_deduction, exchange_rate, currency,
      salary_month, status, payment_method, bank_account_id
      ON public.monthly_salaries FOR EACH ROW EXECUTE FUNCTION public.normalize_salary_financials();
    CREATE TRIGGER trg_post_salary AFTER INSERT OR UPDATE OF base_salary, allowances, overtime_hours, overtime_rate,
      overtime_amount, bonus, deductions, tax_amount, insurance_deduction, gross_salary, net_salary, salary_month,
      status, payment_date, payment_method, bank_account_id, currency
      ON public.monthly_salaries FOR EACH ROW EXECUTE FUNCTION public._trg_post_salary();
  `);
  const balances = sql('supabase/migrations/20261119155637_enforce_finance_organization_isolation.sql');
  await exec(balances.slice(balances.indexOf('CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction'), balances.indexOf('CREATE OR REPLACE FUNCTION public.trg_commission_payment_bank_balance')));
  const payroll = sql('supabase/migrations/20261119231221_post_salary_payments_atomically.sql');
  await exec(payroll);
  await exec(payroll);
  await exec(`
    CREATE TRIGGER trg_bank_balance_update AFTER INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction();
  `);

  await exec(`
    INSERT INTO auth.users(id) VALUES ('${owner}'), ('${manager}'), ('${agent}'), ('${inactive}'), ('${otherOwner}');
    INSERT INTO public.organizations(id) VALUES ('${orgA}'), ('${orgB}');
    INSERT INTO public.organization_members(organization_id, user_id, role, is_active) VALUES
      ('${orgA}','${owner}','owner',true),
      ('${orgA}','${manager}','manager',true),
      ('${orgA}','${agent}','agent',true),
      ('${orgB}','${agent}','agent',true),
      ('${orgB}','${otherOwner}','owner',true),
      ('${orgA}','${inactive}','manager',false);
    INSERT INTO public.organization_salary_settings (organization_id, setting_key, setting_value) VALUES
      ('${orgA}', 'working_days_per_month', 20), ('${orgA}', 'working_hours_per_day', 6), ('${orgA}', 'overtime_multiplier', 2),
      ('${orgB}', 'working_days_per_month', 25), ('${orgB}', 'working_hours_per_day', 7), ('${orgB}', 'overtime_multiplier', 1.2);
    INSERT INTO public.sop_department_members(organization_id,user_id,department)
      VALUES ('${orgA}','${agent}','sales'), ('${orgB}','${agent}','sales');
    INSERT INTO public.bank_accounts (id, organization_id, currency, is_active, treasury_kind) VALUES
      ('${id(31)}','${orgA}','EGP',true,'bank'),
      ('${id(32)}','${orgA}','USD',true,'bank'),
      ('${id(33)}','${orgB}','EGP',true,'bank'),
      ('${id(34)}','${orgA}','EGP',true,'cash');
    INSERT INTO public.employees(id,organization_id,full_name,is_active,base_salary,allowances,national_id)
      VALUES ('${employeeA}','${orgA}','First employee',true,6000,500,'private-a'),
             ('${employeeB}','${orgB}','Other employee',true,7000,750,'private-b');
  `);
  const actor = async user => {
    await exec('RESET ROLE');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await exec('SET ROLE authenticated');
  };
  const allowed = async (org, key) => (await one('select public.has_org_permission($1,$2) as result', [org, key])).result;
  const asOwner = () => actor(owner);
  const override = (org, role, key, granted) => db.query(`
    insert into public.organization_role_permission_defaults (organization_id, base_role, permission_key, granted)
    values ($1,$2,$3,$4) on conflict (organization_id,base_role,permission_key)
    do update set granted=excluded.granted`, [org, role, key, granted]);
  const saveAttendance = (org, employee, status, start = null, end = null) => one(`
    insert into public.employee_attendance(organization_id,employee_id,attendance_date,status,check_in_time,check_out_time)
    values($1,$2,date '2026-11-19',$3,$4,$5)
    on conflict (organization_id,employee_id,attendance_date)
      do update set status=excluded.status,check_in_time=excluded.check_in_time,check_out_time=excluded.check_out_time
    returning id, actual_hours`, [org, employee, status, start, end]);
  const calc = (employee, month = '2026-11-01', overtime = 0) =>
    one('select public.calculate_monthly_salary($1, $2::date, $3) as result', [employee, month, overtime]);
  const pay = (salaryId, method = null, bank = null, date = '2026-11-19') =>
    one("select public.update_salary_status($1, 'paid', $2::date, $3, $4) as result", [salaryId, date, method, bank]);

  await actor(agent);
  assert.equal(await allowed(orgA, 'quotes_create'), true);
  await assert.rejects(override(orgA, 'agent', 'quotes_create', false), { code: '42501' });
  await assert.rejects(db.query('select base_salary from public.employees'), { code: '42501' });
  assert.equal((await one('select base_salary, national_id from public.employee_directory where id=$1', [employeeA])).base_salary, null);
  assert.equal((await calc(employeeA)).result.success, false);

  await asOwner();
  await override(orgA, 'agent', 'quotes_create', false);
  await assert.rejects(override(orgB, 'agent', 'quotes_create', false), { code: '42501' });
  await assert.rejects(override(orgA, 'agent', 'team_manage_roles', true), { code: '23514' });
  await actor(agent);
  assert.equal(await allowed(orgA, 'quotes_create'), false);
  assert.equal(await allowed(orgB, 'quotes_create'), true);
  await asOwner();
  await db.query("delete from public.organization_role_permission_defaults where organization_id=$1 and base_role='agent' and permission_key='quotes_create'", [orgA]);
  await actor(agent);
  assert.equal(await allowed(orgA, 'quotes_create'), true);

  await actor(manager);
  assert.equal(await allowed(orgA, 'team_manage_roles'), false);
  assert.equal(await allowed(orgA, 'employees_attendance_edit'), true);
  const first = await saveAttendance(orgA, employeeA, 'present', '22:00', '06:00');
  assert.equal(Number(first.actual_hours), 8);
  const updated = await saveAttendance(orgA, employeeA, 'vacation');
  assert.equal(updated.id, first.id);
  assert.equal(updated.actual_hours, null);
  const bulk = await db.query(`
    insert into public.employee_attendance(organization_id,employee_id,attendance_date,status)
    values($1,$2,date '2026-11-19','present'),($1,$2,date '2026-11-20','present')
    on conflict (organization_id,employee_id,attendance_date) do nothing returning attendance_date
  `, [orgA, employeeA]);
  assert.equal(bulk.rows.length, 1);
  assert.equal((await one('select status from public.employee_attendance where id=$1',[first.id])).status, 'vacation');
  await assert.rejects(saveAttendance(orgA, employeeB, 'present'), { code: '23503' });
  await assert.rejects(saveAttendance(orgB, employeeB, 'present'), { code: '42501' });
  await assert.rejects(db.query('update public.employees set base_salary=9999 where id=$1', [employeeA]), { code: '42501' });
  assert.equal((await calc(employeeA)).result.success, false);
  await actor(agent);
  assert.equal((await db.query('select id from public.employee_attendance')).rows.length, 0);
  await assert.rejects(saveAttendance(orgA, employeeA, 'absent'), { code: '42501' });

  await asOwner();
  assert.equal(Number((await one('select base_salary from public.employee_directory where id=$1', [employeeA])).base_salary), 6000);
  assert.equal(await one('select id from public.employee_directory where id=$1', [employeeB]), undefined);
  const salary = (await calc(employeeA)).result;
  assert.equal(salary.success, true);
  assert.equal(salary.calculated_data.net_salary, 6500);
  assert.equal((await calc(employeeA)).result.message, 'SALARY_EXISTS');
  await actor(manager);
  assert.equal((await db.query('select id from public.monthly_salaries')).rows.length, 0);
  assert.equal((await one("select public.update_salary_status($1, 'cancelled') as result", [salary.salary_id])).result.success, false);

  await asOwner();
  await override(orgA, 'manager', 'employees_salary', true);
  await actor(manager);
  assert.equal((await db.query('select id from public.monthly_salaries')).rows.length, 1);
  assert.equal((await one("select public.update_salary_status($1, 'cancelled') as result", [salary.salary_id])).result.success, true);
  await assert.rejects(pay(salary.salary_id, 'cash'), /المعلّق فقط/);
  const cashSalary = (await calc(employeeA, '2026-12-01')).result.salary_id;
  await assert.rejects(pay(cashSalary), /اختر طريقة الدفع/);
  await assert.rejects(pay(cashSalary, 'cash'), /اختر حساب الخزينة/);
  await assert.rejects(pay(cashSalary, 'cash', id(31)), /حساب الخزينة غير موجود/);
  assert.equal((await pay(cashSalary, 'cash', id(34))).result.new_status, 'paid');
  assert.equal((await pay(cashSalary, 'cash', id(34))).result.old_status, 'paid');
  await assert.rejects(pay(cashSalary, 'cash', id(34), '2026-11-20'), /تم تسجيل صرف الراتب بالفعل/);
  const transferSalary = (await calc(employeeA, '2027-01-01')).result.salary_id;
  await assert.rejects(pay(transferSalary, 'bank_transfer'), /اختر حساب الخزينة/);
  for (const bankId of [id(32), id(33), id(34)]) {
    await assert.rejects(pay(transferSalary, 'bank_transfer', bankId), /حساب الخزينة غير موجود/);
  }
  await exec('RESET ROLE');
  await db.query("update public.monthly_salaries set currency='USD', net_salary_egp=net_salary*50, exchange_rate=50 where id=$1", [transferSalary]);
  await actor(manager);
  await exec("SET test.reject_journal = 'on'");
  await assert.rejects(pay(transferSalary, 'bank_transfer', id(32)), /Missing salary payable or treasury account/);
  await exec('RESET ROLE');
  assert.equal((await one('select status from public.monthly_salaries where id=$1', [transferSalary])).status, 'pending');
  assert.equal(await one('select amount from public.bank_account_transactions where source_id=$1', [transferSalary]), undefined);
  assert.equal(Number((await one('select current_balance from public.bank_accounts where id=$1', [id(32)])).current_balance), 10000);
  await exec("SET test.reject_journal = 'off'");
  await actor(manager);
  assert.equal((await pay(transferSalary, 'bank_transfer', id(32))).result.new_status, 'paid');
  assert.equal((await pay(transferSalary, 'bank_transfer', id(32))).result.old_status, 'paid');
  assert.equal((await one('select bank_account_id from public.monthly_salaries where id=$1', [transferSalary])).bank_account_id, id(32));
  await assert.rejects(db.query('delete from public.monthly_salaries where id=$1', [transferSalary]), /explicit reversal/);
  await assert.rejects(db.query('update public.monthly_salaries set net_salary=7000 where id=$1', [transferSalary]), /explicit reversal/);
  await assert.rejects(db.query('delete from public.bank_account_transactions where source_id=$1', [transferSalary]), /salary_payment_linked_movement/);
  await exec('RESET ROLE');
  const money = await one(`select j.currency, j.total_credit, j.entry_date::text, m.amount, m.transaction_date::text,
    a.current_balance, l.account_id from public.journal_entries j
    join public.journal_entry_lines l on l.journal_entry_id=j.id and l.credit>0
    join public.bank_account_transactions m on m.source_id=j.reference_id
    join public.bank_accounts a on a.id=m.bank_account_id where j.reference_id=$1 AND j.source_type='salary_payment'`, [transferSalary]);
  assert.deepEqual(money, {currency: 'USD', total_credit: '6500.00', entry_date: '2026-11-19', amount: '6500.00',
    transaction_date: '2026-11-19', current_balance: '3500.00', account_id: id(1010)});
  assert.equal(Number((await one('select current_balance from public.bank_accounts where id=$1', [id(34)])).current_balance), 3500);
  const salaryEntries = await db.query(`
    SELECT j.source_type, l.account_id, l.debit, l.credit
    FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id=j.id
    WHERE j.source_id=$1 ORDER BY j.source_type, l.line_order
  `, [cashSalary]);
  assert.deepEqual(salaryEntries.rows, [
    { source_type: 'salary_accrual', account_id: id(6000), debit: '6500.00', credit: '0' },
    { source_type: 'salary_accrual', account_id: id(2200), debit: '0', credit: '6500.00' },
    { source_type: 'salary_payment', account_id: id(2200), debit: '6500.00', credit: '0' },
    { source_type: 'salary_payment', account_id: id(1000), debit: '0', credit: '6500.00' },
  ]);
  const movements = await one("SELECT count(*)::integer AS total FROM public.bank_account_transactions WHERE source_type='salary_payment' AND source_id=$1", [cashSalary]);
  assert.equal(movements.total, 1);

  await actor(manager);
  const firstOvertime = (await calc(employeeA, '2027-02-01', 2)).result.calculated_data;
  assert.equal(firstOvertime.overtime_rate, 100);
  assert.equal(firstOvertime.net_salary, 6700);
  const underfunded = (await calc(employeeA, '2027-04-01')).result.salary_id;
  await assert.rejects(pay(underfunded, 'cash', id(34)), /Cash treasury has insufficient balance/);
  assert.equal((await one('select status from public.monthly_salaries where id=$1', [underfunded])).status, 'pending');
  assert.equal(await one('select amount from public.bank_account_transactions where source_id=$1', [underfunded]), undefined);
  await actor(otherOwner);
  assert.equal((await calc(employeeA, '2027-03-01', 2)).result.success, false);
  const otherOvertime = (await calc(employeeB, '2027-02-01', 2)).result.calculated_data;
  assert.equal(otherOvertime.overtime_rate, 48);
  assert.equal(otherOvertime.net_salary, 7846);
  await actor(inactive);
  assert.equal((await db.query('select id from public.employee_directory')).rows.length, 0);

  console.log('Organization defaults, tenant isolation, attendance, scoped overtime, and atomic idempotent payroll movements passed.');
} finally {
  await db.close();
}
