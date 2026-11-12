import assert from 'node:assert/strict';
import { compareHotelbedsStayDates } from './trip-file-hotelbeds-detail';

const original = { check_in_date: '2027-01-03', check_out_date: '2027-01-10' };
const booking = (checkIn: unknown, checkOut: unknown) => ({
  booking: {
    reference: 'HB-999999', status: 'CONFIRMED',
    hotel: {
      checkIn, checkOut,
      rooms: [{paxes:[{ name:'PRIVATE GUEST', surname:'PRIVATE SURNAME' }]}],
    },
    holder: {email:'private@example.com'},
    totalNet: 1200.75,
  },
});
const match = compareHotelbedsStayDates(booking('2027-01-03','2027-01-10'),original);
assert.deepEqual(match, {
  checkIn:'match',checkOut:'match',allComparableDatesMatch:true,
  amendmentExecutionVerified:false,
});
assert.ok(!JSON.stringify(match).includes('PRIVATE'));
assert.ok(!JSON.stringify(match).includes('1200'));
const different = compareHotelbedsStayDates(
  booking('2027-01-04','2027-01-11'),original);
assert.equal(different.checkIn,'mismatch');
assert.equal(different.checkOut,'mismatch');
assert.equal(different.allComparableDatesMatch,false);
assert.equal(different.amendmentExecutionVerified,false);
const missing = compareHotelbedsStayDates(
  {booking:{reference:'HB-999999', status:'CONFIRMED'}},original);
assert.deepEqual(missing,{
  checkIn:'not_available',checkOut:'not_available',
  allComparableDatesMatch:null,amendmentExecutionVerified:false,
});
const partial = compareHotelbedsStayDates(booking('2027-01-03',null),original);
assert.equal(partial.checkIn,'match');
assert.equal(partial.checkOut,'not_available');
assert.equal(partial.allComparableDatesMatch,null);
assert.equal(compareHotelbedsStayDates(
  booking('2027-02-29','2027-03-01'), original).checkIn,'not_available');
assert.equal(compareHotelbedsStayDates(
  booking('2027-01-03T00:00:00Z','2027-01-10'), original).checkIn,'not_available');
assert.equal(compareHotelbedsStayDates(
  booking('2027-01-03','2027-01-10'), {check_in_date:null,check_out_date:null}
).allComparableDatesMatch,null);
assert.equal(compareHotelbedsStayDates(null,original).allComparableDatesMatch,null);
assert.equal(compareHotelbedsStayDates({
  booking:{reference:'HB-999999',status:'MODIFIED',hotel:{checkIn:'2027-01-03',checkOut:'2027-01-10'}},
},original).amendmentExecutionVerified,false);
console.log('Hotelbeds hotel current-date comparison: match/mismatch/unknown and PII stripping passed');
