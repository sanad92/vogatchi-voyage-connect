import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/LegacyBookingLink.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const organization = 'first-company';
const otherOrganization = 'second-company';
const booking = (id, legacyId, overrides = {}) => ({
  id, organization_id: organization, booking_type: 'hotel', legacy_table: 'hotel_bookings',
  legacy_id: legacyId, ...overrides,
});
const hotel = (id, bookingId) => ({
  id, organization_id: organization, booking_id: bookingId,
  customer_name: 'Test customer', internal_booking_number: 'HTL-101', hotel_name: 'Test hotel',
  check_in_date: '2026-12-25', check_out_date: '2026-12-30',
});
const fixtures = {
  bookings: [
    booking('canonical-first'), booking('canonical-other', 'canonical-first'),
    booking('parent'), booking('alias-one', 'legacy-linked'), booking('alias-two', 'legacy-linked'),
    booking('unique-alias', 'legacy-only'),
    booking('ambiguous-one', 'legacy-ambiguous'), booking('ambiguous-two', 'legacy-ambiguous'),
    booking('orphan-one', 'legacy-orphan'), booking('orphan-two', 'legacy-orphan'),
    booking('other-company-booking', 'legacy-foreign', { organization_id: otherOrganization }),
    booking('flight-parent', undefined, { booking_type: 'flight', legacy_table: 'flight_bookings' }),
  ],
  hotel_bookings: [
    hotel('canonical-first', null), hotel('legacy-linked', 'parent'),
    hotel('legacy-ambiguous', null), hotel('legacy-foreign', 'other-company-booking'),
  ],
  flight_bookings: [{ id: 'legacy-flight', organization_id: organization, booking_id: 'flight-parent' }],
};
const supabase = {
  from(table) {
    assert.ok(Object.hasOwn(fixtures, table), `unexpected table ${table}`);
    const filters = new Map();
    const find = () => {
      assert.equal(filters.get('organization_id'), organization, 'every lookup must be scoped to the current company');
      return fixtures[table].filter(row => [...filters].every(([field, value]) => row[field] === value));
    };
    return {
      select() { return this; },
      eq(field, value) { filters.set(field, value); return this; },
      async maybeSingle() {
        const rows = find();
        assert.ok(rows.length <= 1, 'singular lookups cannot query ambiguous aliases');
        return { data: rows[0] ?? null, error: null };
      },
      async limit(count) {
        assert.equal(count, 2, 'alias lookup should detect duplicates without fetching all matches');
        return { data: find().slice(0, count), error: null };
      },
    };
  },
};
const exportsObject = {};
runInNewContext(outputText, {
  exports: exportsObject,
  require(module) {
    if (module === '@/integrations/supabase/client') return { supabase };
    return {};
  },
});
const { resolveBookingId } = exportsObject;
assert.equal((await resolveBookingId(organization, 'canonical-first', 'hotel')).canonicalId, 'canonical-first');
assert.equal((await resolveBookingId(organization, 'legacy-linked', 'hotel')).canonicalId, 'parent');
assert.equal((await resolveBookingId(organization, 'legacy-only', 'hotel')).canonicalId, 'unique-alias');
assert.equal((await resolveBookingId(organization, 'legacy-ambiguous', 'hotel')).details.reference, 'HTL-101');
assert.equal((await resolveBookingId(organization, 'legacy-foreign', 'hotel')).details.service, 'Test hotel');
assert.equal((await resolveBookingId(organization, 'legacy-flight', 'flight')).canonicalId, 'flight-parent');
assert.equal(await resolveBookingId(organization, 'legacy-orphan', 'hotel'), null);
assert.equal(await resolveBookingId(organization, 'legacy-linked', 'flight'), null);
assert.equal(await resolveBookingId(organization, 'other-company-booking', 'hotel'), null);
console.log('Legacy links passed canonical precedence, direct parents, unique aliases, ambiguity and company/type scoping.');
