import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function collectPublicTablesFromMigrations(migrationsDir) {
  const tables = new Set();
  if (!fs.existsSync(migrationsDir)) return [];
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)/g;
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = createRegex.exec(content)) !== null) {
      tables.add(match[1]);
    }
  }
  return Array.from(tables).sort();
}

async function main() {
  const rootDir = process.cwd();
  const env = { ...loadEnvFile(path.join(rootDir, '.env')), ...loadEnvFile(path.join(rootDir, '.env.e2e')) };

  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.E2E_SUPER_ADMIN_EMAIL || env.E2E_SUPER_ADMIN_EMAIL;
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD || env.E2E_SUPER_ADMIN_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or anon key.');
    process.exit(1);
  }

  const expectedTables = collectPublicTablesFromMigrations(path.join(rootDir, 'supabase', 'migrations'));

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authError = null;
  if (email && password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    authError = error;
  } else {
    authError = { message: 'Missing E2E_SUPER_ADMIN_EMAIL or E2E_SUPER_ADMIN_PASSWORD' };
  }

  const tablesToTest = [
    'organizations',
    'profiles',
    'customers',
    'suppliers',
    'invoices',
    'employees',
    'organization_members',
    'user_roles',
    'hotel_bookings',
    'flight_bookings',
    'transport_bookings',
    'car_rentals',
    'supplier_payments',
    'customer_segments',
  ];

  const results = [];
  for (const table of tablesToTest) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(5);
    results.push({ table, ok: !error, count: count ?? null, sampleRows: Array.isArray(data) ? data.length : 0, error: error?.message ?? null });
  }

  let crudTest = { table: 'notifications', inserted: false, updated: false, deleted: false, errors: [] };
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      crudTest.errors.push('Unable to resolve authenticated user id.');
    } else {
      const insertRes = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
          priority: 'normal',
          is_read: false,
        })
        .select()
        .single();

      if (insertRes.error) {
        crudTest.errors.push(`insert: ${insertRes.error.message}`);
      } else {
        crudTest.inserted = true;
        const rowId = insertRes.data?.id;
        const updateRes = await supabase
          .from('notifications')
          .update({ message: 'Updated test message' })
          .eq('id', rowId)
          .select()
          .single();
        if (updateRes.error) {
          crudTest.errors.push(`update: ${updateRes.error.message}`);
        } else {
          crudTest.updated = true;
        }
        const deleteRes = await supabase
          .from('notifications')
          .delete()
          .eq('id', rowId);
        if (deleteRes.error) {
          crudTest.errors.push(`delete: ${deleteRes.error.message}`);
        } else {
          crudTest.deleted = true;
        }
      }
    }
  } catch (err) {
    crudTest.errors.push(`unexpected: ${err?.message ?? String(err)}`);
  }

  const output = {
    supabaseUrl,
    expectedTables,
    auth: authError ? { ok: false, error: authError.message } : { ok: true },
    tableTests: results,
    crudTest,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
