import assert from 'node:assert/strict';
import {
  hotelbedsDetailUrl, isSafeHotelbedsReference,
  matchesRegisteredHotelbedsService, parseHotelbedsBookingObservation,
} from './trip-file-hotelbeds';

const ref = 'HB-982134';
assert.equal(isSafeHotelbedsReference(ref), true);
assert.equal(
  hotelbedsDetailUrl('test', ref),
  'https://api.test.hotelbeds.com/hotel-api/1.0/bookings/HB-982134',
);
assert.equal(
  hotelbedsDetailUrl('production', ref),
  'https://api.hotelbeds.com/hotel-api/1.0/bookings/HB-982134',
);
for (const unsafe of [
  '../../etc/passwd', 'https://evil.example', 'HB/123456',
  'HB?x=1', 'a', 'a#path', 'HB_123', 'HB 123',
]) {
  assert.equal(isSafeHotelbedsReference(unsafe), false);
  assert.throws(() => hotelbedsDetailUrl('test', unsafe));
}
assert.throws(() => hotelbedsDetailUrl('development' as any, ref));

const source = {
  organization_id: 'org-A', booking_id: 'trip-A',
  booking_reference_supplier: ref,
  booking_source: 'hotelbeds', supplier_name: null,
};
assert.equal(matchesRegisteredHotelbedsService(source,'org-A','trip-A',ref),true);
assert.equal(matchesRegisteredHotelbedsService(source,'org-B','trip-A',ref),false);
assert.equal(matchesRegisteredHotelbedsService(source,'org-A','trip-B',ref),false);
assert.equal(matchesRegisteredHotelbedsService(source,'org-A','trip-A','HB-999999'),false);
assert.equal(matchesRegisteredHotelbedsService({...source,booking_source:'manual'},'org-A','trip-A',ref),false);
assert.equal(matchesRegisteredHotelbedsService({
  ...source,booking_source:'manual',supplier_name:'Hotelbeds Spain S.L.',
},'org-A','trip-A',ref),true);
assert.equal(matchesRegisteredHotelbedsService({
  ...source,booking_source:'manual',supplier_name:'Other Partner',
},'org-A','trip-A',ref),false);

const payload = {
  booking: {
    reference: ref, status: 'CONFIRMED',
    holder: { name: 'Private Name', email: 'private@example.com' },
    totalNet: 123.45, rooms: [{paxes:[{name:'Private Guest'}]}],
  },
};
const observed = parseHotelbedsBookingObservation(payload,ref);
assert.deepEqual(observed,{
  reference:ref, providerStatus:'CONFIRMED',rawStatusRecognized:true,
  bookingObserved:true,amendmentExecutionVerified:false,
});
const serialized = JSON.stringify(observed);
assert.ok(!serialized.includes('Private') && !serialized.includes('123.45'));
assert.equal(parseHotelbedsBookingObservation({
  booking:{ reference:ref,status:'CANCELLED'},
},ref).providerStatus,'CANCELLED');
assert.equal(parseHotelbedsBookingObservation({
  booking:{ reference:ref,status:'PENDING_PAYMENT'},
},ref).providerStatus,'UNKNOWN');
assert.equal(parseHotelbedsBookingObservation({
  booking:{ reference:ref,status:'MODIFIED'},
},ref).amendmentExecutionVerified,false);
assert.throws(() => parseHotelbedsBookingObservation(payload,'HB-999999'));
assert.throws(() => parseHotelbedsBookingObservation({booking:{}},ref));
assert.throws(() => parseHotelbedsBookingObservation({bookings:[payload.booking]},ref));
assert.throws(() => parseHotelbedsBookingObservation(null,ref));

console.log('Hotelbeds read-only reference binding and PII-stripping observations passed');
