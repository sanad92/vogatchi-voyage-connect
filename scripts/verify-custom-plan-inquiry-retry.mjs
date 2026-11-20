import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import {
  finishCustomPlanInquiryRequest, getCustomPlanInquiryRequestId,
} from '../src/lib/customPlanInquiryRetry.ts';

const migration = new URL('../supabase/migrations/20261120133023_create_platform_custom_plan_inquiries.sql', import.meta.url);
const db = new PGlite();
const stored = new Map();
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => { stored.set(key, value); },
    removeItem: key => { stored.delete(key); },
  },
});

const inquiry = {
  _company_name: 'Fixture Agency', _contact_name: 'Fixture Contact',
  _email: 'retry@example.test', _phone: '+201122233300',
  _message: 'Book two seasonal staff accounts', _consent: true, _honeypot: null,
};
const request = (payload, memory = new Map()) => getCustomPlanInquiryRequestId(JSON.stringify(payload), memory);
const submit = async (id, payload) => (await db.query(
  'SELECT public.submit_platform_custom_plan_inquiry($1,$2,$3,$4,$5,$6,$7,$8) AS receipt',
  [id, payload._company_name, payload._contact_name, payload._email, payload._phone,
    payload._message, payload._consent, payload._honeypot],
)).rows[0].receipt;

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE FUNCTION public.is_platform_admin_v2(uuid) RETURNS boolean LANGUAGE sql AS 'SELECT false';
    CREATE TABLE public.admin_audit_log (user_id uuid, action text, target_table text, target_id uuid, details jsonb);
  `);
  await db.exec(readFileSync(migration, 'utf8'));
  await db.exec('SET ROLE anon');

  const openForm = new Map();
  const originalId = await request(inquiry, openForm);
  const saved = await submit(originalId, inquiry);
  assert.equal(await request(inquiry, openForm), originalId, 'same mounted form reuses its pending attempt');
  assert.equal(stored.size, 1);
  const storage = [...stored.values()][0];
  for (const value of Object.values(inquiry).filter(value => typeof value === 'string')) {
    assert.ok(!storage.includes(value), 'do not persist raw inquiry fields');
  }

  // The first database commit succeeded, but its response was lost. A reload loses in-memory attempts.
  const reloadedForm = new Map();
  const retryId = await request(inquiry, reloadedForm);
  assert.equal(retryId, originalId);
  assert.deepEqual(await submit(retryId, inquiry), saved);
  await db.exec('RESET ROLE');
  assert.equal(Number((await db.query('SELECT count(*) AS total FROM platform_inquiries_private.custom_plan_inquiries')).rows[0].total), 1);
  await db.exec('SET ROLE anon');

  const different = { ...inquiry, _message: 'Book a larger plan' };
  const differentId = await request(different);
  assert.notEqual(differentId, originalId, 'changed fields form a separate submission');
  assert.notEqual((await submit(differentId, different)).reference, saved.reference);

  finishCustomPlanInquiryRequest(retryId, reloadedForm);
  assert.equal(await request(different), differentId, 'confirmation preserves other pending contents');
  const newId = await request(inquiry);
  assert.notEqual(newId, originalId, 'confirmed receipt allows a later intentional same-content submission');
  assert.notEqual((await submit(newId, inquiry)).reference, saved.reference);

  // storage can fail without preventing an ordinary same-page retry
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true, get() { throw new Error('storage denied'); },
  });
  const noStorage = new Map();
  assert.equal(await request(inquiry, noStorage), await request(inquiry, noStorage));
  console.log('Custom plan retry recovered a committed request after reload and kept new or changed requests separate.');
} finally {
  await db.close();
}
