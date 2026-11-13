/**
 * Decode an untrusted HTTP JSON body without buffering unbounded input.
 * Applies to browser requests, Travelport OAuth and reservation responses.
 * Caller retains responsibility for Content-Type, authentication and status.
 */
export async function readBoundedJsonBody(
  stream: ReadableStream<Uint8Array> | null,
  byteLimit: number,
): Promise<unknown> {
  if (!stream || !Number.isSafeInteger(byteLimit) || byteLimit < 1) {
    throw new Error('invalid_json_stream');
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('invalid_json_chunk');
      // Compare before buffering the current chunk to enforce byte (not char) limits.
      if (value.byteLength > byteLimit - total) throw new Error('json_body_too_large');
      total += value.byteLength;
      chunks.push(value);
    }
  } catch (error) {
    // Stop a too-large or broken upstream response rather than draining it.
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (!total) throw new Error('empty_json_body');
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('invalid_json_body');
  }
}
