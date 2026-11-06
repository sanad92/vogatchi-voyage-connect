import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const queue = read('src/pages/OperationsQueue.tsx');
const hook = read('src/hooks/useOpsCommandCenter.ts');
const booking = read('src/hooks/useBookingWorkspace.tsx');
const services = read('src/hooks/useBookingServices.ts');
const itinerary = read('src/components/bookings/workspace/ItineraryTab.tsx');

assert.match(hook, /ACTIVE_TASK_STATUSES\s*=\s*\['open', 'in_progress', 'pending'\]/);
assert.match(hook, /COMPLETED_TASK_STATUSES\s*=\s*\['done', 'completed'\]/);
assert.match(hook, /\.eq\('organization_id', orgId\)/);
assert.match(hook, /\.gte\('completed_at', start\)\.lt\('completed_at', end\)/);
assert.match(queue, /status:\s*'done'/);
assert.match(queue, /\.eq\('organization_id', orgId\)/);
assert.match(queue, /if \(!updated\?\.id\)/);
assert.doesNotMatch(queue, /status:\s*'completed'/);
assert.match(booking, /qc\.invalidateQueries\(\{ queryKey: \['workspace-tasks', bookingId\] \}\)/);
assert.match(booking, /\.eq\('booking_id', bookingId\)/);
assert.match(services, /if \(failed\) throw new Error/);
assert.match(itinerary, /isError \?/);
console.log('Safar Operations task and itinerary contract checks passed.');
