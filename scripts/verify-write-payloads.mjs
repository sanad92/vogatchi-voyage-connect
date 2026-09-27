import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, console, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
const columns = await load('../src/lib/writeColumns.ts');
let orgId = 'org-a', authenticatedUser = { id: 'user-a' }, serverError = null;
const calls = [];
const client = {
  auth: { getUser: async () => ({ data: { user: authenticatedUser }, error: null }) },
  functions: { invoke: async () => ({ data: null, error: null }) },
  from(table) {
    const call = { table, filters: [] };
    const q = {
      insert(payload) { call.payload = Array.isArray(payload) ? payload[0] : payload; call.action = 'insert'; return q; },
      update(payload) { call.payload = payload; call.action = 'update'; return q; },
      delete() { call.action = 'delete'; return q; },
      select: () => q,
      eq(field, value) { call.filters.push([field, value]); return q; },
      single: async () => { calls.push(call); return { data: serverError ? null : { id: 'record', ...call.payload }, error: serverError }; },
    };
    return q;
  },
};
const imports = {
  '@tanstack/react-query': { useQuery: () => ({}), useMutation: options => ({ mutate: options.mutationFn, mutateAsync: options.mutationFn, isPending: false }), useQueryClient: () => ({ invalidateQueries: async () => {} }) },
  '@/integrations/supabase/client': { supabase: client },
  '@/hooks/use-toast': { toast: () => {}, useToast: () => ({ toast: () => {} }) },
  sonner: { toast: { success: () => {}, error: () => {} } },
  './useOrgId': { useOrgId: () => orgId }, '@/hooks/useOrgId': { useOrgId: () => orgId },
  '@/contexts/ParentBookingContext': { useParentBookingLink: () => ({ withParentBooking: value => ({ ...value, booking_id: 'parent' }), syncParent: async () => {} }) },
  '@/utils/databaseErrors': { getFriendlyDatabaseError: () => '' }, '@/lib/writeColumns': columns,
};
const { useCarRentals } = await load('../src/hooks/useCarRentals.tsx', imports);
const { useTransportBookings } = await load('../src/hooks/useTransportBookings.tsx', imports);
const { useFlightBookings } = await load('../src/hooks/useFlightBookings.tsx', imports);
const { useExpenseTransactionsOptimized } = await load('../src/hooks/useExpenseTransactionsOptimized.tsx', imports);
const sample = { customer_name: 'Test', currency: 'USD', rental_start_date: '2026-10-01', rental_end_date: '2026-10-02', departure_date: '2026-10-01', arrival_date: '2026-10-02', status_id: 'status-id', status: { name: 'Confirmed' }, customer: { name: 'Joined customer' }, vehicle_type: { name: 'Joined vehicle' }, source_id: 'view-only', organization_id: 'org-b', created_by: 'forged-user', id: 'view-id' };
await useCarRentals().addCarRental(sample);
await useTransportBookings().updateTransportBooking({ ...sample, id: 'transport-id' });
await useFlightBookings().addFlightBooking({ ...sample, passenger_details: [{ first_name: 'Test', last_name: 'Passenger' }], baggage_info: { checked_baggage: '20 kg' } });
await useFlightBookings().updateFlightBooking({ id: 'flight-id', airline: { name: 'Joined' }, passenger_details: null, baggage_info: null, status_id: 'new-status' });
await useExpenseTransactionsOptimized().addTransaction({ ...sample, description: 'Test expense', amount: 25, category_id: 'category-id', expense_categories: { name: 'Joined category' } });
await useExpenseTransactionsOptimized().updateTransaction({ id: 'expense-id', amount: 30, expense_categories: { name: 'Joined category' }, created_by: 'forged-user', organization_id: 'org-b' });
assert.equal(calls.length, 6);
for (const call of calls) {
  for (const key of ['customer','vehicle_type','source_id','airline','expense_categories','id']) assert.ok(!(key in call.payload), `${call.table}: no ${key}`);
  if (call.action === 'insert') assert.equal(call.payload.organization_id, 'org-a');
  else assert.ok(call.filters.some(([key, value]) => key === 'organization_id' && value === 'org-a'));
  if (call.table !== 'expense_transactions') assert.ok(!('status' in call.payload), 'Joined booking status must not reach a table');
}
assert.equal(calls[0].payload.booking_id, 'parent');
assert.equal(calls[1].payload.status_id, 'status-id');
assert.ok(Array.isArray(calls[2].payload.passenger_details));
assert.equal(typeof calls[2].payload.baggage_info, 'object');
assert.equal(calls[3].payload.passenger_details, null); assert.equal(calls[3].payload.baggage_info, null);
assert.equal(calls[4].payload.created_by, 'user-a');
assert.ok(!('created_by' in calls[5].payload)); assert.ok(!('organization_id' in calls[5].payload));
serverError = { message: 'Denied' };
await assert.rejects(useFlightBookings().updateFlightBooking({ id: 'flight-id', status_id: 'x' }));
serverError = null; authenticatedUser = null;
const count = calls.length;
await assert.rejects(useExpenseTransactionsOptimized().addTransaction({ description: 'Test', amount: 1 }));
orgId = null;
await assert.rejects(useFlightBookings().addFlightBooking(sample));
await assert.rejects(useTransportBookings().updateTransportBooking({ id: 'id' }));
assert.equal(calls.length, count);

const hotelModule = await load('../src/hooks/useHotels.ts', imports);
const destinationModule = await load('../src/hooks/useDestinations.ts', imports);
const hotel = hotelModule.normalizeHotel({ name: 'Existing hotel', name_ar: null, address: 'Existing address', amenities: ['Wi-Fi'], features: null, features_ar: null, contact_info: null, phone: 'TEST', rating: null });
assert.equal(hotel.name_ar, 'Existing hotel'); assert.equal(hotel.location, 'Existing address');
assert.equal(JSON.stringify(hotel.features), '["Wi-Fi"]'); assert.equal(hotel.rating, null);
const destination = destinationModule.normalizeDestination({ name: 'Cairo', country: 'Egypt', name_ar: null, country_ar: null });
assert.equal(destination.name_ar, 'Cairo'); assert.equal(destination.country_ar, 'Egypt');
orgId = 'org-a';
await hotelModule.useHotels().addHotel({ name: 'Hotel', name_ar: 'فندق', organization_id: 'org-b' });
assert.equal(calls.at(-1).payload.organization_id, 'org-a');
console.log('Write payloads: 6 real hook mutation paths passed join/view filtering, organization scoping, parent link, native JSON, creator identity and clear-null checks; denial, missing identity and legacy catalog fallback checks also passed. No live writes were performed.');
