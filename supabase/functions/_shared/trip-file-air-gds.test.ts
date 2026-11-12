import assert from 'node:assert/strict';
import {
  travelportReservationUrl, validTravelportLocator, isRegisteredGdsFlight,
  parseTravelportAirObservation, amadeusEnterpriseContractReady,
} from './trip-file-air-gds';

assert.equal(travelportReservationUrl('preproduction','2BPSMS'),
  'https://api.pp.travelport.net/11/air/book/reservation/reservations/2BPSMS');
assert.equal(travelportReservationUrl('production','2BPSMS'),
  'https://api.travelport.net/11/air/book/reservation/reservations/2BPSMS');
for (const s of ['/etc/passwd','..', '2BP?MS','2B/SM', 'a',
  '2BPSMS#', 'https://example.com','', 'abc def']) {
  assert.equal(validTravelportLocator(s),false,s);
  assert.throws(() => travelportReservationUrl('preproduction',s));
}
assert.throws(() => travelportReservationUrl('unknown' as any,'2BPSMS'));

const tp = {
  organization_id:'org-a', booking_id:'book-a', supplier_reference:'2BPSMS',
  supplier_name:'Travelport Galileo',
};
assert.equal(isRegisteredGdsFlight(tp,'org-a','book-a','2BPSMS','travelport'),true);
assert.equal(isRegisteredGdsFlight(tp,'org-b','book-a','2BPSMS','travelport'),false);
assert.equal(isRegisteredGdsFlight(tp,'org-a','book-b','2BPSMS','travelport'),false);
assert.equal(isRegisteredGdsFlight(tp,'org-a','book-a','DIFFERENT','travelport'),false);
assert.equal(isRegisteredGdsFlight(tp,'org-a','book-a','2BPSMS','amadeus'),false);
assert.equal(isRegisteredGdsFlight({...tp,supplier_name:'Amadeus GDS'},
  'org-a','book-a','2BPSMS','amadeus'),true);
assert.equal(isRegisteredGdsFlight({...tp,supplier_name:'Independent consolidator'},
  'org-a','book-a','2BPSMS','travelport'),false);

const response = (codes:string[],reference='2BPSMS',source='1G') => ({
  ReservationResponse:{
    Reservation:{
      Identifier:{authority:'Travelport',value:'internal-uuid'},
      Traveler:[{PersonName:{Given:'PRIVATE',Surname:'TRAVELLER'},Email:'private@example.com'}],
      Receipt:[{
        '@type':'ReceiptConfirmation',
        Identifier:{authority:'Travelport',value:'receipt-uuid'},
        Confirmation:{
          Locator:{source,value:reference},
          OfferStatus:{StatusAir:codes.map(code=>({code,flightRefs:['Flight_01']}))},
        },
      }],
      Payment:[{CardNumber:'4111111111111111'}],
    },
  },
});
const ok = parseTravelportAirObservation(response(['HK']),'2BPSMS');
assert.deepEqual(ok,{
  provider:'travelport',bookingReferenceMatched:true,
  reservationStatus:'CONFIRMED',scheduleChangeFlag:false,
  amendmentExecutionVerified:false,ticketingVerified:false,
});
assert.ok(!JSON.stringify(ok).includes('PRIVATE'));
assert.ok(!JSON.stringify(ok).includes('4111111111111111'));
assert.equal(parseTravelportAirObservation(response(['TK']),'2BPSMS').reservationStatus,
  'SCHEDULE_CHANGE');
assert.equal(parseTravelportAirObservation(response(['UN']),'2BPSMS').scheduleChangeFlag,true);
assert.equal(parseTravelportAirObservation(response(['HK','TK']),'2BPSMS').reservationStatus,
  'SCHEDULE_CHANGE');
assert.equal(parseTravelportAirObservation(response(['XX']),'2BPSMS').reservationStatus,
  'CANCELLED');
assert.equal(parseTravelportAirObservation(response(['HL']),'2BPSMS').reservationStatus,
  'WAITLISTED');
assert.equal(parseTravelportAirObservation(response(['HN']),'2BPSMS').reservationStatus,
  'PENDING');
assert.equal(parseTravelportAirObservation(response(['HK','HN']),'2BPSMS').reservationStatus,
  'PENDING');
assert.equal(parseTravelportAirObservation(response([]),'2BPSMS').reservationStatus,
  'UNKNOWN');
assert.throws(()=>parseTravelportAirObservation(response(['HK'],'MISMAT'),'2BPSMS'));
assert.throws(()=>parseTravelportAirObservation(response(['HK'],'2BPSMS','AA'),'2BPSMS'));
const ambiguous = response(['HK']);
(ambiguous.ReservationResponse.Reservation.Receipt as any[]).push(
  JSON.parse(JSON.stringify(ambiguous.ReservationResponse.Reservation.Receipt[0])),
);
assert.throws(()=>parseTravelportAirObservation(ambiguous,'2BPSMS'));
assert.throws(()=>parseTravelportAirObservation({},'2BPSMS'));
assert.equal(amadeusEnterpriseContractReady({legacySelfService:true}),false);
console.log('Trip File Travelport GDS v11: safe lookup, PII-stripping and Amadeus fail-closed checks passed.');
