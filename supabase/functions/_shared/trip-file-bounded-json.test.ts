import assert from 'node:assert/strict';
import { readBoundedJsonBody } from './trip-file-bounded-json';

const utf8 = new TextEncoder();
const stream = (...chunks: Uint8Array[]) => new ReadableStream<Uint8Array>({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(chunk);
    controller.close();
  },
});

const sample = utf8.encode('{"ok":true,"count":2}');
assert.deepEqual(await readBoundedJsonBody(stream(sample), sample.length), {
  ok: true, count: 2,
});
assert.deepEqual(await readBoundedJsonBody(stream(
  sample.subarray(0, 5), sample.subarray(5),
), sample.length), { ok: true, count: 2 });
await assert.rejects(readBoundedJsonBody(stream(sample), sample.length - 1), /json_body_too_large/);
await assert.rejects(readBoundedJsonBody(stream(), 20), /empty_json_body/);
await assert.rejects(readBoundedJsonBody(null, 20), /invalid_json_stream/);
await assert.rejects(readBoundedJsonBody(stream(sample), 0), /invalid_json_stream/);
await assert.rejects(readBoundedJsonBody(stream(utf8.encode('{bad')), 20), /invalid_json_body/);
await assert.rejects(readBoundedJsonBody(stream(new Uint8Array([0xff])), 20), /invalid_json_body/);

const multiByte = utf8.encode('{"city":"القاهرة"}');
assert.deepEqual(await readBoundedJsonBody(stream(
  multiByte.subarray(0, 9), multiByte.subarray(9, 13), multiByte.subarray(13),
), multiByte.length), { city: 'القاهرة' });
await assert.rejects(readBoundedJsonBody(stream(multiByte), multiByte.length - 1), /json_body_too_large/);

let cancelled = false;
const tooLarge = new ReadableStream<Uint8Array>({
  pull(controller) { controller.enqueue(new Uint8Array(4096)); },
  cancel() { cancelled = true; },
});
await assert.rejects(readBoundedJsonBody(tooLarge, 1024), /json_body_too_large/);
assert.equal(cancelled, true, 'rejecting a large response must cancel the stream');

console.log('Trip File bounded JSON: exact byte limits, UTF-8, split chunks and cancellation passed');
