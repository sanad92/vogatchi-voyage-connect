import assert from 'node:assert/strict';
import {
  safeAirLocator, sameAirBookingReference, providerFromSupplier,
  travelportRetrieveUrl, travelportOAuthUrl, parseTravelportReservation,
  sabreEndpoints, parseSabreReservation,
} from './trip-file-air-provider';

const locator = 'BXPJVM';
assert.equal(safeAirLocator(locator), true);
for(const unsafe of ['../../etc/passwd','https://travelport.com','A234','1234567','A12/34',
  'A12?34','a12BCD','123\n45','A12-34','A12_34',null]) {
  assert.equal(safeAirLocator(unsafe),false);
}
assert.equal(travelportRetrieveUrl('preproduction',locator),
  'https://api.pp.travelport.net/11/air/book/reservation/reservations/BXPJVM');
assert.equal(travelportRetrieveUrl('production',locator),
  'https://api.travelport.net/11/air/book/reservation/reservations/BXPJVM');
assert.equal(travelportOAuthUrl('preproduction'),
  'https://auth.pp.travelport.net/oauth/token');
assert.equal(travelportOAuthUrl('production'),
  'https://auth.travelport.net/oauth/token');
assert.throws(() => travelportRetrieveUrl('preproduction','x?env=production'));
assert.throws(() => travelportRetrieveUrl('unsupported' as any,locator));
assert.throws(() => travelportOAuthUrl('unsupported' as any));
assert.equal(providerFromSupplier('Travelport+ (Galileo)'),'travelport');
assert.equal(providerFromSupplier('Travelport GDS'),'travelport');
assert.equal(providerFromSupplier('Galileo'),'travelport');
assert.equal(providerFromSupplier('Sabre GDS'),'sabre');
assert.equal(providerFromSupplier('Sabreware'),null);
assert.equal(providerFromSupplier('Amadeus Enterprise'), 'amadeus_enterprise');
assert.equal(providerFromSupplier('Amadeus GDS'), 'amadeus_enterprise');
assert.equal(providerFromSupplier('Any Supplier Ltd'),null);
assert.equal(providerFromSupplier(null),null);

const flight = {
  organization_id:'org1',booking_id:'bk1',
  booking_reference: locator,supplier_reference:null,
  supplier_name:'Travelport',
};
assert.equal(sameAirBookingReference(flight,'org1','bk1',locator,'travelport'),true);
assert.equal(sameAirBookingReference(flight,'org2','bk1',locator,'travelport'),false);
assert.equal(sameAirBookingReference(flight,'org1','bk2',locator,'travelport'),false);
assert.equal(sameAirBookingReference(flight,'org1','bk1',locator,'amadeus_enterprise'),false);
assert.equal(sameAirBookingReference({...flight,booking_reference:'INTERN',
  supplier_reference:locator},'org1','bk1',locator,'travelport'),true);
assert.equal(sameAirBookingReference({...flight,supplier_name:'Other Supplier'},
  'org1','bk1',locator,'travelport'),false);

function payload(statuses: Array<{ code:string; value:string }> = [{code:'HK',value:'Confirmed'}]){
  return {
    ReservationResponse:{
      Reservation:{
        Identifier:{authority:'Travelport',value:'private-internal-id'},
        Traveler:[{PersonName:{Given:'SECRET NAME'},Email:'secret@example.com'}],
        Payment:[{Card:{Number:'4111111111111111'}}],
        Receipt:[{
          '@type':'ReceiptConfirmation',
          Identifier:{authority:'Travelport',value:'internal-id'},
          Confirmation:{Locator:{source:'1G',value:locator},
            OfferStatus:{StatusAir:statuses}},
        }, {
          '@type':'ReceiptConfirmation',
          Identifier:{authority:'Airline',value:'another-id'},
          Confirmation:{Locator:{source:'AA',sourceContext:'VendorLocator',value:'ABCDEF'}},
        }],
      }
    }
  };
}
const confirmed=parseTravelportReservation(payload(),locator);
assert.deepEqual(confirmed,{
  provider:'travelport',bookingLocatorMatched:true,
  airStatus:'confirmed',statusSampleCount:1,
  ticketIssuanceVerified:false,amendmentExecutionVerified:false,
});
assert.ok(!JSON.stringify(confirmed).includes('SECRET'));
assert.ok(!JSON.stringify(confirmed).includes('4111111111111111'));
assert.equal(parseTravelportReservation(payload([{code:'TK',value:'Modified'}]),locator).airStatus,'modified');
assert.equal(parseTravelportReservation(payload([{code:'XX',value:'Cancelled'}]),locator).airStatus,'cancelled');
assert.equal(parseTravelportReservation(payload([
  {code:'HK',value:'Confirmed'},{code:'XX',value:'Cancelled'},
]),locator).airStatus,'mixed');
assert.equal(parseTravelportReservation(payload([
  {code:'HK',value:'Confirmed'},{code:'ZZ',value:'Unknown'},
]),locator).airStatus,'mixed');
assert.equal(parseTravelportReservation(payload([]),locator).airStatus,'unknown');
assert.throws(() => parseTravelportReservation(payload(),'ZZZZZZ'));
assert.throws(() => parseTravelportReservation(null,locator));
assert.throws(() => parseTravelportReservation({ReservationResponse:{}},locator));
const forged=payload();
(forged.ReservationResponse.Reservation.Receipt[0].Identifier as any).authority='Airline';
assert.throws(()=>parseTravelportReservation(forged,locator));
const duplicate=payload();
duplicate.ReservationResponse.Reservation.Receipt.push(
  duplicate.ReservationResponse.Reservation.Receipt[0],
);
assert.throws(()=>parseTravelportReservation(duplicate,locator));
const vendorOnly=payload();
(vendorOnly.ReservationResponse.Reservation.Receipt[0].Confirmation.Locator as any).sourceContext='VendorLocator';
assert.throws(()=>parseTravelportReservation(vendorOnly,locator));
console.log('Trip File air provider lookup: strict PNR, source binding, status mix, PII safety passed');

assert.deepEqual(sabreEndpoints('preproduction'), {
  token: 'https://api.cert.platform.sabre.com/v2/auth/token',
  retrieve: 'https://api.cert.platform.sabre.com/v1/trip/orders/getBooking',
});
assert.deepEqual(sabreEndpoints('production'), {
  token: 'https://api.platform.sabre.com/v2/auth/token',
  retrieve: 'https://api.platform.sabre.com/v1/trip/orders/getBooking',
});
assert.throws(() => sabreEndpoints('unknown' as never));
assert.equal(sameAirBookingReference({...flight,supplier_name:'Sabre GDS'},'org1','bk1',locator,'sabre'),true);
assert.equal(sameAirBookingReference({...flight,supplier_name:'Sabre GDS'},'org1','bk1',locator,'travelport'),false);

const sabre = {
  bookingId: locator,
  flights: [{ status: 'HK' }],
  travelers: [{ name: 'SECRET NAME' }],
  isTicketed: true,
};
assert.deepEqual(parseSabreReservation(sabre, locator), {
  provider: 'sabre', bookingLocatorMatched: true, airStatus: 'unknown',
  statusSampleCount: 0, ticketIssuanceVerified: false, amendmentExecutionVerified: false,
});
assert.throws(() => parseSabreReservation({ ...sabre, bookingId: 'OTHER1', request: { confirmationId: locator } }, locator));
assert.throws(() => parseSabreReservation({ ...sabre, flights: [] }, locator));
assert.throws(() => parseSabreReservation({ ...sabre, flights: [null] }, locator));
assert.throws(() => parseSabreReservation({ ...sabre, errors: [{ category: 'ERROR' }] }, locator));
assert.throws(() => parseSabreReservation({ ...sabre, errors: {} }, locator));
assert.throws(() => parseSabreReservation(null, locator));
console.log('Sabre fixed environments, exact provider booking match and sanitized read-only result passed');
