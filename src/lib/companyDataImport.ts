export const importFields = {
  customers: ['name', 'phone', 'email', 'nationality', 'address'],
  suppliers: ['name', 'type', 'contact_person', 'phone', 'email', 'address', 'notes'],
  employees: ['full_name', 'employee_code', 'position', 'phone', 'email', 'department'],
} as const;

export type ImportTable = keyof typeof importFields;
type ImportRecord = Record<string, string>;
export type ImportRow = { row: number; record: ImportRecord; key: string };
export type ImportPreview = { rows: ImportRow[]; duplicates: number[]; errors: string[] };

const aliases: Record<string, string> = {
  'الاسم': 'name', 'اسم العميل': 'name', 'اسم المورد': 'name', 'اسم الموظف': 'full_name',
  'الهاتف': 'phone', 'رقم الهاتف': 'phone', 'البريد الإلكتروني': 'email',
  'البريد الالكتروني': 'email', 'الجنسية': 'nationality', 'العنوان': 'address',
  'نوع المورد': 'type', 'supplier_type': 'type', 'جهة الاتصال': 'contact_person',
  'ملاحظات': 'notes', 'كود الموظف': 'employee_code', 'المسمى الوظيفي': 'position',
  'القسم': 'department',
};

export function importKey(table: ImportTable, row: Record<string, unknown>): string {
  const normalize = (value: unknown) => String(value ?? '').trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
  if (table === 'employees') return normalize(row.employee_code);
  const name = normalize(row.name);
  if (table === 'suppliers') return JSON.stringify([name, normalize(row.type) || 'hotel']);
  const phone = normalize(row.phone).replace(/[^0-9٠-٩۰-۹]/g, '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0));
  return JSON.stringify([name, phone || normalize(row.email)]);
}

export function previewCompanyImport(table: ImportTable, [header = [], ...data]: unknown[][]): ImportPreview {
  const allowed = new Set<string>(importFields[table]);
  const rawHeaders = header.map(value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' '));
  const hasType = rawHeaders.includes('type');
  const headers = rawHeaders.map(key => {
    if (table === 'suppliers' && hasType && key === 'supplier_type') return '';

    return aliases[key] ?? key.replace(/ /g, '_');
  });
  const knownHeaders = headers.filter(value => allowed.has(value));
  const required = table === 'employees' ? ['full_name', 'employee_code'] : ['name'];
  const errors = required.filter(key => !headers.includes(key)).map(key => `عمود مطلوب: ${key}`);
  if (new Set(knownHeaders).size !== knownHeaders.length) errors.push('بعض الأعمدة مكررة في رأس الملف.');
  const rows: ImportRow[] = [];
  const duplicates: number[] = [];
  const keys = new Set<string>();
  for (const [index, cells] of data.entries()) {
    if (!cells.some(value => String(value ?? '').trim())) continue;
    const row = index + 2;
    const record = Object.fromEntries(headers.flatMap((key, column) => {
      const value = String(cells[column] ?? '').trim();
      return allowed.has(key) && value ? [[key, value]] : [];
    }));
    if (required.some(key => !record[key])) {
      errors.push(`الصف ${row}: أكمل ${required.join('، ')}.`);
      continue;
    }
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      errors.push(`الصف ${row}: البريد الإلكتروني غير صالح.`);
      continue;
    }
    const key = importKey(table, record);
    if (keys.has(key)) {
      duplicates.push(row);
      continue;
    }
    keys.add(key);
    rows.push({ row, record, key });
  }
  if (!rows.length && !errors.length) errors.push('الملف لا يحتوي على سجلات للاستيراد.');
  return { rows, duplicates, errors };
}

export async function importRecordId(orgId: string, table: ImportTable, key: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([orgId, table, key]))));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
