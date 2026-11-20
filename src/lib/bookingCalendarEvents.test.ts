import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookingCalendarEvents } from './bookingCalendarEvents.ts';

const from = '2027-01-01';
const to = '2027-01-31';
const journey = { id: 'bk-one', start_date: '2027-01-04', end_date: '2027-01-09' };

test('round-trip calendar separates outbound and return dates and local times', () => {
  const events = bookingCalendarEvents({
    ...journey, booking_type: 'flight', booking_flight_details: [{
      departure_date: '2027-01-04', departure_time: '23:30:00',
      arrival_date: '2027-01-05', arrival_time: '01:45:00',
      return_departure_date: '2027-01-09', return_departure_time: '13:50:00',
      return_arrival_date: '2027-01-09', return_arrival_time: '16:10:00',
    }],
  }, from, to);
  assert.deepEqual(events.map(({ kind, date, time }) => [kind, date, time]), [
    ['flight', '2027-01-04', '23:30'], ['arrival', '2027-01-05', '01:45'],
    ['flight', '2027-01-09', '13:50'], ['arrival', '2027-01-09', '16:10'],
  ]);
});

test('pickup time and location appear with the transition, and only in the visible range', () => {
  const events = bookingCalendarEvents({
    ...journey, booking_type: 'transport', booking_transport_details: {
      pickup_time: '04:15:00', pickup_point: 'المطار', dropoff_point: 'الفندق',
    },
  }, from, '2027-01-04');
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'pickup');
  assert.equal(events[0].time, '04:15');
  assert.match(events[0].title, /المطار/);
});

test('old bookings retain their header dates and cancelled bookings leave the schedule', () => {
  assert.deepEqual(bookingCalendarEvents({ ...journey, booking_type: 'flight' }, from, to).map(event => event.date), [journey.start_date, journey.end_date]);
  assert.deepEqual(bookingCalendarEvents({ ...journey, booking_type: 'hotel', workflow_stage: 'cancelled' }, from, to), []);
});
