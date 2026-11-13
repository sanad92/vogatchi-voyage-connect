/** Strip PostgREST filter syntax characters from free-text search before using it in .or(). */
export function sanitizeSearchTerm(input: string, max = 100): string {
  return String(input ?? '').replace(/[,()*%\\:"'.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
