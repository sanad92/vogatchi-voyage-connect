// Allowed inbound file types and sizes for stored media/attachments.
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/'];
const ALLOWED_EXACT = new Set([
  'application/pdf', 'text/plain', 'text/csv', 'text/calendar',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed', 'application/rtf', 'message/rfc822',
]);
const BLOCKED = new Set(['image/svg+xml', 'text/html', 'application/xhtml+xml']);
const BLOCKED_EXT = /\.(html?|svg|xhtml|js|mjs|exe|bat|cmd|com|scr|msi|ps1|vbs|jar|sh|apk|dll)$/i;

export function isAllowedFile(mime: string | null | undefined, size: number, fileName = ''): boolean {
  const m = String(mime || '').toLowerCase().split(';')[0].trim();
  if (!m || size <= 0 || size > MAX_MEDIA_BYTES) return false;
  if (BLOCKED.has(m) || BLOCKED_EXT.test(fileName)) return false;
  return ALLOWED_EXACT.has(m) || ALLOWED_PREFIXES.some((p) => m.startsWith(p));
}
