import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadModule(path, resolve) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function('exports', 'require', outputText)(exports, resolve);
  return exports;
}

const bookings = Array.from({ length: 612 }, (_, index) => ({
  id: String(index + 1).padStart(4, '0'),
  organization_id: index < 601 ? 'org-a' : 'org-b',
  booking_number: `BK-${index + 1}`,
  booking_type: 'flight',
  created_at: '2026-05-01T21:59:59Z',
  currency: 'SAR',
  status: index % 2 ? 'cancelled' : 'canceled',
}));
bookings[600].created_at = '2026-05-02T00:00:00Z';
bookings[599].currency = 'EGP';
bookings[598].status = 'confirmed';
bookings[597].booking_type = 'hotel';
const selections = [];
let queryFailure = false;
const supabase = {
  from(table) {
    assert.equal(table, 'bookings');
    let rows = bookings;
    let limit;
    const selectColumns = new Set();
    const filter = (predicate) => {
      rows = rows.filter(predicate);
      return query;
    };
    const query = {
      select(columns) {
        for (const column of columns.split(', ')) selectColumns.add(column);
        selections.push(columns);
        return query;
      },
      eq: (column, value) => filter((row) => row[column] === value),
      gte: (column, value) => filter((row) => new Date(row[column]) >= new Date(value)),
      lt: (column, value) => filter((row) => new Date(row[column]) < new Date(value)),
      gt: (column, value) => filter((row) => row[column] > value),
      in: (column, values) => filter((row) => values.includes(row[column])),
      order(column) { assert.equal(column, 'id'); return query; },
      limit(value) { limit = value; return query; },
      then(resolve) {
        const data = rows.slice(0, limit).map((row) =>
          Object.fromEntries(Object.entries(row).filter(([column]) => selectColumns.has(column))),
        );
        resolve(queryFailure ? { data: null, error: new Error('Data unavailable') } : { data, error: null });
      },
    };
    return query;
  },
};

const bookingStatuses = await loadModule('../src/lib/bookingStatus.ts');
const { loadBookingReportRows, bookingReportCells } = await loadModule('../src/lib/reportRows.ts', (from) => {
  if (from === '@/integrations/supabase/client') return { supabase };
  assert.equal(from, '@/lib/bookingStatus');
  return bookingStatuses;
});
const scope = { start: '2026-05-01', end: '2026-05-01', currency: 'SAR', service: 'flight', status: 'cancelled' };
const rows = await loadBookingReportRows('org-a', scope);
assert.equal(rows.length, 597);
assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
assert.deepEqual(bookingReportCells(rows[0]), ['BK-1', 'طيران', 'ملغي', '2026-05-01', undefined, 'SAR']);
assert.equal(rows.at(-1).id, '0597');
assert.equal((await loadBookingReportRows('org-b', scope)).length, 11);
assert.equal((await loadBookingReportRows('org-a', { ...scope, start: '2026-05-02', end: '2026-05-02' })).length, 1);
assert.equal((await loadBookingReportRows('org-b', { ...scope, currency: 'EGP' })).length, 0);
assert.ok(selections.every((columns) => !columns.includes('*') && !columns.includes('customer')));
queryFailure = true;
await assert.rejects(loadBookingReportRows('org-a', scope), /Data unavailable/);
console.log('Report rows respect tenant, UTC period, currency, service and status, with stable pagination and explicit failure.');
