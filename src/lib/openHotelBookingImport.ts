export const hotelImportFields = [
  'source_reference', 'customer_id', 'supplier_id', 'hotel_name', 'check_in', 'check_out',
  'rooms', 'room_type', 'board_type', 'supplier_reference', 'currency', 'selling_price',
  'cost_price', 'customer_paid', 'supplier_paid', 'notes',
] as const;

const required = [
  'source_reference', 'customer_id', 'hotel_name', 'check_in', 'check_out', 'rooms',
  'currency', 'selling_price', 'cost_price', 'customer_paid', 'supplier_paid',
];

function formatExcelDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function hotelImportRows([header = [], ...body]: unknown[][]): Record<string, string>[] {
  const keys = header.map(value => String(value ?? '').trim().toLowerCase());
  const missing = required.filter(key => !keys.includes(key));
  if (missing.length) throw new Error(`أعمدة مطلوبة: ${missing.join('، ')}`);
  const named = keys.filter(Boolean);
  if (new Set(named).size !== named.length) throw new Error('بعض الأعمدة مكررة في رأس الملف.');
  const unknown = named.filter(key => !(hotelImportFields as readonly string[]).includes(key));
  if (unknown.length) throw new Error(`أعمدة غير موجودة في القالب: ${unknown.join('، ')}`);

  const rows = body.filter(row => row.some(value => String(value ?? '').trim())).map(row => {
    return Object.fromEntries(keys.flatMap((key, index) => {
      if (!key) return [];
      const cell = row[index];
      const value = cell instanceof Date && (key === 'check_in' || key === 'check_out')
        ? formatExcelDate(cell)
        : String(cell ?? '').trim();
      return [[key, key === 'currency' ? value.toUpperCase() : value]];
    }));
  });
  if (rows.length < 1 || rows.length > 50) throw new Error('أضف من 1 إلى 50 حجزًا في كل دفعة.');
  return rows;
}
