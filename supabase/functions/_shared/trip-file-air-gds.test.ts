import assert from 'node:assert/strict';
import {
  airRetrieveUrl, registeredAirServiceMatches, parseAirObservation, validAirReference,
} from './trip-file-air-gds';

const amadeus = 'ORD_7FD42Q';
const travelport = '2BPSMS';
assert.equal(airRetrieveUrl('amadeus_self_service','test',amadeus),
  'https://test.api.amadeus.com/v1/booking/flight-orders/ORD_7FD42Q');
assert.equal(airRetrieveUrl('amadeus_self_service','production',amadeus),
  'https://api.amadeus.com/v1/booking/flight-orders/ORD_7FD42Q');
assert.equal(airRetrieveUrl('travelport_json_v11','test',travelport),
  'https://api.pp.travelport.net/11/air/book/reservation/reservations/2BPSMS');
assert.equal(airRetrieveUrl('travelport_json_v11','production',travelport),
  'https://api.travelport.net/11/air/book/reservation/reservations/2BPSMS');
for(const unsafe of ['../../etc/passwd','http://evil.test','A/B','a?x=1','', 'ABC #']) {
  assert.equal(validAirReference('amadeus_self_service',unsafe),false);
  assert.equal(validAirReference('travelport_json_v11',unsafe),false);
  assert.throws(()=>airRetrieveUrl('travelport_json_v11','test',unsafe));
}
assert.throws(()=>airRetrieveUrl('travelport_json_v11','staging' as any,travelport));
const base = {
  organization_id:'companyA',booking_id:'bookingA',
  booking_reference:'ABC123',supplier_reference:amadeus,supplier_name:'Amadeus',
};
assert.equal(registeredAirServiceMatches(base,'amadeus_self_service','companyA','bookingA',amadeus),true);
assert.equal(registeredAirServiceMatches(base,'amadeus_self_service','companyB','bookingA',amadeus),false);
assert.equal(registeredAirServiceMatches(base,'amadeus_self_service','companyA','bookingB',amadeus),false);
assert.equal(registeredAirServiceMatches({...base,supplier_reference:null},
  'amadeus_self_service','companyA','bookingA',amadeus),false);
assert.equal(registeredAirServiceMatches({...base,supplier_name:'Unrelated'},
  'amadeus_self_service','companyA','bookingA',amadeus),false);
assert.equal(registeredAirServiceMatches({...base,booking_reference:travelport,
  supplier_reference:null,supplier_name:'Travelport'},'travelport_json_v11',
  'companyA','bookingA',travelport),true);
const a=parseAirObservation('amadeus_self_service',{
  data:{id:amadeus,travelers:[{name:{firstName:'PRIVATE',lastName:'GUEST'}}],
    ticketingAgreement:{option:'DELAY_TO_QUEUE'}},
},amadeus);
assert.deepEqual(a,{
  provider:'amadeus_self_service',referenceMatched:true,reservationObserved:true,
  ticketingVerified:false,amendmentExecutionVerified:false,supplierStatus:'present',
});
assert.ok(!JSON.stringify(a).includes('PRIVATE'));
assert.throws(()=>parseAirObservation('amadeus_self_service',{data:{id:'OTHER'}},amadeus));
const t=parseAirObservation('travelport_json_v11',{
  ReservationResponse:{Reservation:{Identifier:[{value:travelport,source:'Travelport'}],
    Traveler:[{PersonName:{Given:'PRIVATE'}}],Offer:[{id:'o1'}]}},
},travelport);
assert.equal(t.ticketingVerified,false);
assert.equal(t.amendmentExecutionVerified,false);
assert.equal(t.supplierStatus,'unknown');
assert.ok(!JSON.stringify(t).includes('PRIVATE'));
assert.throws(()=>parseAirObservation('travelport_json_v11',
  {ReservationResponse:{Reservation:{Identifier:[{value:'WRONG'}]}}},travelport));
console.log('Air GDS Amadeus/Travelport reference binding, fixed GET URLs, and PII-safe observations passed');
