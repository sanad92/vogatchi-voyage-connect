/** Neutralize spreadsheet formula injection (CSV/Excel). */
const FORMULA_START = /^[=+\-@\t\r]/;

export function safeCell<T>(value: T): T | string {
  if (typeof value !== 'string') return value;
  return FORMULA_START.test(value) ? `'${value}` : value;
}

export function safeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return (rows || []).map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row || {})) out[k] = safeCell(v);
    return out as T;
  });
}

export function csvCell(value: unknown): string {
  const v = safeCell(value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value));
  return `"${String(v).replace(/"/g, '""')}"`;
}
