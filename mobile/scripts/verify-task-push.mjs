import assert from 'node:assert/strict';
import { findTaskPushDetails } from '../src/app/taskPushDetails.ts';

const user = '00000000-0000-4000-8000-000000000001';
const anotherUser = '00000000-0000-4000-8000-000000000002';
const organization = '00000000-0000-4000-8000-000000000003';
const anotherOrganization = '00000000-0000-4000-8000-000000000004';
const booking = '00000000-0000-4000-8000-000000000005';
const taskId = '00000000-0000-4000-8000-000000000006';
const notification = '00000000-0000-4000-8000-000000000007';

const records = {
  notifications: {
    id: notification, user_id: user, organization_id: organization,
    action_url: `/bookings/${booking}?tab=tasks&task=${taskId}`,
  },
  booking_tasks: {
    id: taskId, booking_id: booking, organization_id: organization,
    assignee_id: user, status: 'pending', title: 'متابعة الحجز',
    description: 'تفاصيل المهمة', due_at: '2026-11-29T12:00:00Z',
  },
};
const signal = new AbortController().signal;
let taskReads = 0;
const client = {
  from(table) {
    const filters = [];
    let columns;
    const query = {
      select(value) { columns = value.split(',').map(column => column.trim()); return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      abortSignal(value) { assert.equal(value, signal); return query; },
      async maybeSingle() {
        const record = records[table];
        if (table === 'booking_tasks') taskReads++;
        const matches = filters.every(([key, value]) => record[key] === value);
        return { data: matches ? Object.fromEntries(columns.map(key => [key, record[key]])) : null, error: null };
      },
    };
    return query;
  },
};
const open = (userId = user) => findTaskPushDetails(client, notification, userId, signal);

assert.deepEqual(await open(), {
  state: 'active', title: records.booking_tasks.title,
  description: records.booking_tasks.description, dueAt: records.booking_tasks.due_at,
});
for (const status of ['canceled', 'cancelled', 'done', 'completed']) {
  records.booking_tasks.status = status;
  assert.deepEqual(await open(), { state: status.startsWith('cancel') ? 'cancelled' : 'completed' });
}
records.booking_tasks.assignee_id = anotherUser;
assert.equal(await open(), null, 'the original recipient cannot load a reassigned task');
const previousReads = taskReads;
assert.equal(await open(anotherUser), null, 'a different recipient cannot use the same notification ID');
assert.equal(taskReads, previousReads, 'no task details are read for a different notification recipient');
records.booking_tasks.assignee_id = user;
records.booking_tasks.organization_id = anotherOrganization;
assert.equal(await open(), null, 'a task from a different organization is unavailable');
records.booking_tasks.organization_id = organization;
records.booking_tasks.booking_id = anotherOrganization;
assert.equal(await open(), null, 'a task attached to a different booking is unavailable');
console.log('Task push checks passed for live, completed, cancelled, and reassigned tasks.');
