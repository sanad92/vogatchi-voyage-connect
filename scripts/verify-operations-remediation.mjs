import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import { createElement } from 'react';
import * as react from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = (file) => read(`../supabase/migrations/${file}`);
const db = await PGlite.create();

const org = '10000000-0000-4000-8000-000000000001';
const user = '10000000-0000-4000-8000-000000000002';
const customer = '10000000-0000-4000-8000-000000000003';
const otherCustomer = '10000000-0000-4000-8000-000000000004';
const noEmail = '10000000-0000-4000-8000-000000000005';
const journey = '10000000-0000-4000-8000-000000000006';
const step = '10000000-0000-4000-8000-000000000007';
const template = '10000000-0000-4000-8000-000000000008';
const templateParent = '10000000-0000-4000-8000-000000000009';
const templateChild = '10000000-0000-4000-8000-000000000010';
const conversation = '10000000-0000-4000-8000-000000000011';
const stale = '10000000-0000-4000-8000-000000000012';
const knownSent = '10000000-0000-4000-8000-000000000013';
const fresh = '10000000-0000-4000-8000-000000000014';
const ready = '10000000-0000-4000-8000-000000000015';
const exhausted = '10000000-0000-4000-8000-000000000016';

await db.exec(`
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  SELECT set_config('request.jwt.claim.sub', '${user}', false);
  CREATE FUNCTION public.user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql STABLE AS
    $$ SELECT $1 = '${user}'::uuid AND $2 = '${org}'::uuid $$;
  CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql STABLE AS
    $$ SELECT public.user_belongs_to_org(auth.uid(), $1) AND $2 = 'customers_create' $$;

  CREATE TABLE public.organizations(id uuid PRIMARY KEY);
  INSERT INTO public.organizations VALUES ('${org}');
  CREATE TABLE public.customers (
    id uuid PRIMARY KEY, organization_id uuid, created_by uuid, name text, email text,
    is_demo boolean NOT NULL DEFAULT false, archived_at timestamptz
  );
  CREATE TABLE public.email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, email_type text,
    recipient_email text NOT NULL, recipient_name text, subject text, template_data jsonb
  );
  CREATE TABLE public.whatsapp_followups (
    id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid,
    status text NOT NULL, mode text NOT NULL DEFAULT 'auto_send',
    remind_at timestamptz NOT NULL DEFAULT now(), attempt_count integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
    sent_at timestamptz, sent_message_id uuid, last_error text
  );
  CREATE TABLE public.whatsapp_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, conversation_id uuid,
    idempotency_key text, sent_at timestamptz, status text
  );
  GRANT ALL ON public.whatsapp_followups, public.whatsapp_messages TO service_role;
`);

await db.exec(migration('20260726131313_2f4a549b-153c-4943-8ebb-f2a12f02f6b0.sql').split('INSERT INTO public.marketing_journeys(')[0]);
await db.exec(migration('20260327225912_f45cfded-f1ba-4c93-b141-14a16bfe2766.sql'));
await db.exec(migration('20261119231108_save_marketing_journey_draft_atomically.sql'));
await db.exec(migration('20261119231256_recover_whatsapp_followup_claims.sql'));
await db.exec(migration('20261119231632_deduplicate_customer_registration_automation.sql'));

try {
  await db.exec(`
    GRANT SELECT ON public.customers, public.automation_rules, public.automation_actions TO authenticated;
    GRANT SELECT, INSERT ON public.automation_logs TO authenticated;
    GRANT INSERT ON public.email_queue TO authenticated;
    INSERT INTO public.customers (id, organization_id, created_by, name, email) VALUES
      ('${customer}', '${org}', '${user}', 'Customer', 'customer@example.invalid'),
      ('${otherCustomer}', '${org}', gen_random_uuid(), 'Other', 'other@example.invalid'),
      ('${noEmail}', '${org}', '${user}', 'No email', NULL);
    WITH rules AS (
      INSERT INTO public.automation_rules (organization_id, name, trigger_type, trigger_config) VALUES
        ('${org}', 'Email', 'customer_registered', '{"has_email":true}'),
        ('${org}', 'Legacy', 'customer_registered', '{}'),
        ('${org}', 'Unavailable', 'booking_created', '{"has_email":true}')
      RETURNING id
    )
    INSERT INTO public.automation_actions (rule_id, action_type) SELECT id, 'send_email' FROM rules;
    INSERT INTO public.marketing_journeys (id, organization_id, name, trigger_event, is_active, is_template) VALUES
      ('${journey}', '${org}', 'Existing', 'customer.created', TRUE, FALSE),
      ('${template}', NULL, 'Template', 'customer.created', FALSE, TRUE);
    INSERT INTO public.journey_steps (id, journey_id, step_order, step_type, branch_yes_step_id) VALUES
      ('${step}', '${journey}', 0, 'wait', NULL),
      ('${templateParent}', '${template}', 0, 'condition', '${templateChild}'),
      ('${templateChild}', '${template}', 1, 'exit', NULL);
    INSERT INTO public.whatsapp_followups (id, organization_id, conversation_id, status, locked_at, attempt_count) VALUES
      ('${stale}', '${org}', '${conversation}', 'sending', now() - interval '20 minutes', 1),
      ('${knownSent}', '${org}', '${conversation}', 'sending', now() - interval '20 minutes', 1),
      ('${fresh}', '${org}', '${conversation}', 'sending', now(), 1),
      ('${ready}', '${org}', '${conversation}', 'pending', NULL, 2),
      ('${exhausted}', '${org}', '${conversation}', 'pending', NULL, 3);
    INSERT INTO public.whatsapp_messages(organization_id, conversation_id, idempotency_key, sent_at, status)
    VALUES ('${org}', '${conversation}', 'followup:${knownSent}', now(), 'sent');
  `);

  await db.exec('SET ROLE authenticated');
  const queued = (id) => db.query('SELECT public.queue_customer_registration_automation($1, $2) AS queued', [org, id]);
  assert.equal((await queued(customer)).rows[0].queued, 1);
  assert.equal((await queued(customer)).rows[0].queued, 0);
  assert.equal((await queued(otherCustomer)).rows[0].queued, 0);
  assert.equal((await queued(noEmail)).rows[0].queued, 0);

  const save = (name, steps) => db.query(
    "SELECT public.save_marketing_journey_draft($1, $2, '', 'custom', 'customer.created', NULL, $3)",
    [journey, name, JSON.stringify(steps)],
  );
  const retained = { id: step, step_type: 'wait', config: {}, delay_minutes: 15 };
  await save('Updated', [retained]);
  await assert.rejects(save('Partial update', [retained, { step_type: 'invalid', config: {} }]));
  assert.deepEqual((await db.query('SELECT name, is_active FROM public.marketing_journeys WHERE id = $1', [journey])).rows, [
    { name: 'Updated', is_active: true },
  ]);
  assert.deepEqual((await db.query('SELECT id, delay_minutes FROM public.journey_steps WHERE journey_id = $1', [journey])).rows, [
    { id: step, delay_minutes: 15 },
  ]);
  await db.query('INSERT INTO public.journey_enrollments (journey_id, organization_id, current_step_id) VALUES ($1, $2, $3)', [journey, org, step]);
  await assert.rejects(save('In-flight update', []), { code: '55000' });

  const { rows: [clone] } = await db.query('SELECT public.clone_marketing_journey_template($1, $2) AS id', [template, org]);
  const clonedSteps = (await db.query(
    'SELECT id, branch_yes_step_id FROM public.journey_steps WHERE journey_id = $1 ORDER BY step_order', [clone.id],
  )).rows;
  assert.equal(clonedSteps.length, 2);
  assert.equal(clonedSteps[0].branch_yes_step_id, clonedSteps[1].id);
  assert.notEqual(clonedSteps[1].id, templateChild);

  await db.exec('RESET ROLE; SET ROLE service_role');
  assert.equal((await db.query('SELECT public.recover_stale_whatsapp_followups() AS count')).rows[0].count, 2);
  assert.deepEqual((await db.query('SELECT id, attempt_count FROM public.claim_due_whatsapp_followups(25)')).rows, [
    { id: ready, attempt_count: 3 },
  ]);
  assert.equal((await db.query('SELECT id FROM public.claim_due_whatsapp_followups(25)')).rows.length, 0);
  const statuses = Object.fromEntries((await db.query('SELECT id, status FROM public.whatsapp_followups')).rows.map(row => [row.id, row.status]));
  assert.equal(statuses[stale], 'failed');
  assert.equal(statuses[knownSent], 'sent');
  assert.equal(statuses[fresh], 'sending');
  assert.equal(statuses[exhausted], 'pending');
} finally {
  await db.close();
}

const loadTypeScript = async (path) => {
  const code = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
};
const { getFinancialSummary } = await loadTypeScript('../supabase/functions/ai-assistant-chat/financial-summary.ts');
const data = {
  bookings: [{ currency: 'EGP', selling_price: 300, cost_price: 50 }, { currency: 'USD', selling_price: 90, cost_price: 20 }],
  customer_payments: [{ currency: 'EGP', amount: 150, status: 'completed' }],
  supplier_payments: [{ currency: 'EGP', amount: 80, status: 'paid' }, { currency: 'EGP', amount: 20, status: 'pending' }, { currency: 'USD', amount: 7, status: 'completed' }],
  expense_transactions: [
    { currency: 'USD', amount: 4, status: 'paid' },
    { currency: 'USD', amount: 9, status: 'approved' },
    { currency: 'USD', amount: 70, status: 'pending' },
  ],
  invoices: [{ currency: 'USD', final_amount: 180, total_paid_amount: 45, status: 'sent' }, { currency: 'EGP', final_amount: 900, status: 'draft' }],
};
const financialClient = (failedTable) => ({
  from(table) {
    let rows = data[table];
    assert.ok(rows, `Unexpected financial source ${table}`);
    const builder = {
      select: () => builder,
      eq: (key, value) => {
        if (key === 'status') rows = rows.filter(row => row.status === value);
        return builder;
      },
      in: (key, values) => {
        rows = rows.filter(row => values.includes(row[key]));
        return builder;
      },
      not: (key, operator, values) => {
        assert.equal(operator, 'in');
        rows = rows.filter(row => !values.slice(1, -1).split(',').includes(row[key]));
        return builder;
      },
      gte: () => builder, lt: () => builder, lte: () => builder, order: () => builder,
      range: async (first, last) => table === failedTable
        ? { data: null, error: { code: 'fixture_error' } }
        : { data: rows.slice(first, last + 1), error: null },
    };
    return builder;
  },
});
const results = await getFinancialSummary(financialClient(), org, '2026-10-01', '2026-10-31');
assert.equal(results.bookings_count, 2);
assert.deepEqual(results.by_currency.map(({ currency, paid_to_suppliers, current_outstanding_receivables }) =>
  [currency, paid_to_suppliers, current_outstanding_receivables]), [['EGP', 80, 0], ['USD', 7, 135]]);
assert.equal(results.by_currency.find(group => group.currency === 'USD').recognized_expenses, 13);
const failure = await getFinancialSummary(financialClient('expense_transactions'), org, '2026-10-01', '2026-10-31');
assert.ok(failure.error);
assert.ok(!failure.by_currency);
assert.equal((await getFinancialSummary(financialClient(), org, '2026-02-31', '2026-03-01')).by_currency, undefined);
const { getMonitoringReadState } = await loadTypeScript('../src/lib/monitoringReadState.ts');
assert.equal(getMonitoringReadState('pending', 0), 'loading');
assert.equal(getMonitoringReadState('success', 0), 'empty');
assert.equal(getMonitoringReadState('success', 1), 'ready');
assert.equal(getMonitoringReadState('error', 0), 'error');
assert.equal(getMonitoringReadState('error', 5), 'error');

const monitoringSource = ts.transpileModule(read('../src/pages/MonitoringDashboard.tsx'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const renderMonitoring = (errorsStatus) => {
  const readStatuses = {
    'monitoring-errors': { status: errorsStatus, data: errorsStatus === 'error' ? undefined : [] },
    'monitoring-performance': { status: 'success', data: [] },
    'monitoring-api': { status: 'success', data: [{ id: 'api-fixture', status_code: 200 }] },
    'monitoring-audit': { status: 'pending' },
  };
  const readFunctions = {};
  const dbFailure = new Error('Monitoring database is unavailable');
  const builder = {
    select: () => builder, eq: () => builder, order: () => builder,
    limit: async () => ({ data: null, error: dbFailure }),
  };
  const box = ({ children }) => createElement('div', null, children);
  const ui = new Proxy({}, { get: () => box });
  const exports = {};
  vm.runInNewContext(monitoringSource, {
    exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name.startsWith('@/components/ui/')) return ui;
      if (name === 'lucide-react') return ui;
      if (name === '@tanstack/react-query') return {
        useQuery: ({ queryKey: [key], queryFn }) => {
          readFunctions[key] = queryFn;
          const source = readStatuses[key];
          assert.ok(source, `Unexpected monitoring source ${key}`);
          return { ...source, isError: source.status === 'error', isPending: source.status === 'pending' };
        },
        useMutation: () => ({}),
        useQueryClient: () => ({}),
      };
      if (name === '@/hooks/useOrgId') return { useOrgId: () => org };
      if (name === '@/integrations/supabase/client') return { supabase: { from: () => builder } };
      if (name === '@/lib/monitoringReadState') return { getMonitoringReadState };
      if (name === 'date-fns') return { format: () => '' };
      if (name === 'date-fns/locale' || name === 'sonner') return {};
      throw new Error(`Unexpected monitoring import ${name}`);
    },
  });
  return { html: renderToStaticMarkup(createElement(exports.default)), readFunctions };
};
const { html: failedMonitoring, readFunctions: monitoringReads } = renderMonitoring('error');
for (const readMonitoring of Object.values(monitoringReads)) {
  await assert.rejects(readMonitoring, /Monitoring database is unavailable/);
}
assert.match(failedMonitoring, /تعذّر تحميل المؤشر/);
assert.match(failedMonitoring, /تعذّر تحميل السجل/);
assert.match(failedMonitoring, /لا توجد بيانات/);
assert.match(failedMonitoring, /جارٍ التحميل/);
assert.doesNotMatch(failedMonitoring, /لا توجد سجلات أخطاء|0<span[^>]*> ms/);
assert.match(renderMonitoring('success').html, /لا توجد سجلات أخطاء/);

const { bookingTaskDueBucket } = await loadTypeScript('../src/lib/bookingTaskDue.ts');
const cairoLateEvening = Date.parse('2026-11-19T21:30:00.000Z');
assert.equal(bookingTaskDueBucket('2026-11-19T21:15:00.000Z', cairoLateEvening), 'overdue');
assert.equal(bookingTaskDueBucket('2026-11-19T21:45:00.000Z', cairoLateEvening), 'today');
assert.equal(bookingTaskDueBucket('2026-11-19T22:00:00.000Z', cairoLateEvening), 'upcoming');
assert.equal(bookingTaskDueBucket(null, cairoLateEvening), 'upcoming');

const confirmationSource = ts.transpileModule(read('../supabase/functions/send-booking-confirmation/index.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
async function confirmBooking({ email = true, phone = true, emailError = false, whatsapp, deny = false, bookingStatus = 'confirmed', queueState = 'pending' }) {
  const calls = [];
  const authHeader = 'Bearer test-user';
  const selectedCustomer = {
    id: customer, email: email ? 'customer@example.invalid' : null, phone: phone ? '100' : null,
    whatsapp_opt_out: false, organization_id: org,
  };
  const bookingQuery = {
    select: () => bookingQuery,
    eq(column, value) {
      assert.deepEqual([column, value], ['id', journey]);
      return bookingQuery;
    },
    single: async () => ({ data: {
      organization_id: org, customer: selectedCustomer, currency: 'USD', total_cost: 50, status: { name: bookingStatus },
    }, error: null }),
  };
  const service = {
    rpc: async (fn, args) => {
      calls.push('email');
      assert.equal(fn, 'enqueue_approved_transactional_email');
      assert.equal(args._org, org);
      assert.equal(args._key, `transport:${journey}`);
      assert.equal(args._data.amount, 50);
      assert.equal(args._data.currency, 'USD');
      return { data: queueState, error: emailError ? { message: 'Queue unavailable' } : null };
    },
  };
  const caller = {
    auth: { getUser: async token => {
      assert.equal(token, 'test-user');
      return { data: { user: { id: user } }, error: null };
    } },
    from(table) {
      assert.equal(table, 'transport_bookings');
      return bookingQuery;
    },
    functions: { invoke: async (name, { body }) => {
      calls.push('whatsapp');
      assert.equal(name, 'send-whatsapp-message');
      assert.equal(body.customerId, customer);
      assert.equal(body.organizationId, org);
      assert.equal(body.messageType, 'text');
      assert.equal(body.idempotencyKey, `booking-confirmation:transport:${journey}`);
      return whatsapp;
    } },
  };
  let handler;
  vm.runInNewContext(confirmationSource, {
    exports: {}, Response,
    console: { error: () => {} },
    Deno: { env: { get: name => name } },
    require(name) {
      if (name === 'https://deno.land/std@0.168.0/http/server.ts') return { serve: fn => { handler = fn; } };
      if (name === 'npm:@supabase/supabase-js@2') return { createClient: (_url, key, options) => {
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return service;
        assert.equal(options.global.headers.Authorization, authHeader);
        return caller;
      } };
      assert.equal(name, '../_shared/auth.ts');
      return { requireOrgMembership: async (client, receivedUser, receivedOrg) => {
        assert.equal(client, service);
        assert.equal(receivedUser, user);
        assert.equal(receivedOrg, org);
        if (deny) throw new Error('Forbidden');
      } };
    },
  });
  const res = await handler(new Request('https://test.invalid/confirm', {
    method: 'POST', headers: { Authorization: authHeader },
    body: JSON.stringify({ bookingId: journey, bookingType: 'transport' }),
  }));
  return { body: await res.json(), status: res.status, calls };
}

const rejected = { data: { success: false }, error: { message: 'Provider error' } };
assert.deepEqual((await confirmBooking({ emailError: true, whatsapp: rejected })).body, {
  success: false, status: 'failed', results: { email: 'failed', whatsapp: 'failed' },
});
assert.deepEqual((await confirmBooking({ whatsapp: rejected })).body, {
  success: false, status: 'partial', results: { email: 'queued', whatsapp: 'failed' },
});
assert.deepEqual((await confirmBooking({ phone: false })).body, {
  success: false, status: 'pending', results: { email: 'queued', whatsapp: 'skipped' },
});
assert.deepEqual((await confirmBooking({ email: false, whatsapp: {
  data: { success: true, duplicate: true, message: { status: 'sending' } }, error: null,
} })).body, { success: false, status: 'pending', results: { email: 'skipped', whatsapp: 'pending' } });
assert.deepEqual((await confirmBooking({ whatsapp: {
  data: { success: true, providerMessageId: 'fixture-message' }, error: null,
} })).body, { success: true, status: 'sent', results: { email: 'queued', whatsapp: 'sent' } });
assert.deepEqual(await confirmBooking({ bookingStatus: 'cancelled' }), {
  body: { success: false, status: 'skipped', results: { email: 'skipped', whatsapp: 'skipped' } },
  status: 200, calls: [],
});
assert.deepEqual((await confirmBooking({ phone: false, queueState: 'sent' })).body, {
  success: true, status: 'sent', results: { email: 'sent', whatsapp: 'skipped' },
});
assert.deepEqual(await confirmBooking({ deny: true }), {
  body: { error: 'Forbidden' }, status: 403, calls: [],
});

console.log('Operations remediation: CRM permissions/conditions/idempotency, journey atomicity and branches, WhatsApp recovery/attempts, currency-aware AI totals, monitoring read states, Cairo booking deadlines, and confirmation channel outcomes passed.');
