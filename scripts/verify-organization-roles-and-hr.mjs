import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const db = new PGlite();
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const exec = db.exec.bind(db);
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [orgA, orgB, owner, manager, agent, inactive, employeeA, employeeB] = [1, 2, 11, 12, 13, 14, 21, 22].map(id);

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
      overtime_rate numeric, overtime_amount numeric, bonus numeric, deductions numeric, gross_salary numeric,
      net_salary numeric, net_salary_egp numeric, exchange_rate numeric, currency text, status text,
      notes text, created_by uuid, payment_date date, payment_method text, bank_account_id uuid,
      updated_at timestamptz
    );
    CREATE TABLE public.organization_salary_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, setting_key text, setting_value numeric
    );
    CREATE TABLE public.bank_accounts (id uuid, organization_id uuid, currency text, is_active boolean);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees, public.monthly_salaries, public.organization_salary_settings TO authenticated;
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

  await exec(`
    INSERT INTO auth.users(id) VALUES ('${owner}'), ('${manager}'), ('${agent}'), ('${inactive}');
    INSERT INTO public.organizations(id) VALUES ('${orgA}'), ('${orgB}');
    INSERT INTO public.organization_members(organization_id, user_id, role, is_active) VALUES
      ('${orgA}','${owner}','owner',true),
      ('${orgA}','${manager}','manager',true),
      ('${orgA}','${agent}','agent',true),
      ('${orgB}','${agent}','agent',true),
      ('${orgA}','${inactive}','manager',false);
    INSERT INTO public.sop_department_members(organization_id,user_id,department)
      VALUES ('${orgA}','${agent}','sales'), ('${orgB}','${agent}','sales');
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
  const calc = employee => one("select public.calculate_monthly_salary($1, date '2026-11-01') as result", [employee]);

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
  await actor(inactive);
  assert.equal((await db.query('select id from public.employee_directory')).rows.length, 0);

  console.log('Organization defaults, department fallback, tenant isolation, attendance upserts, and payroll access passed.');
} finally {
  await db.close();
}
