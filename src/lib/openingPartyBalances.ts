export const openingPartyBalanceFields = ['party_type', 'party_id', 'currency', 'legacy_balance'] as const;

export function openingPartyBalanceRows([header = [], ...body]: unknown[][]) {
  const columns = header.map(cell => String(cell ?? '').trim().toLowerCase());
  const fields = columns.filter(Boolean);
  if (fields.length !== openingPartyBalanceFields.length || openingPartyBalanceFields.some(key => !fields.includes(key))) {
    throw new Error('استخدم الأعمدة الأربعة الموجودة في قالب الأرصدة الافتتاحية.');
  }
  const rows = body.filter(row => row.some(cell => String(cell ?? '').trim()));
  if (rows.length < 1 || rows.length > 100) throw new Error('أضف من 1 إلى 100 رصيد في كل ملف.');

  return rows.map(row => {
    const cell = (key: typeof openingPartyBalanceFields[number]) => String(row[columns.indexOf(key)] ?? '').trim();
    return {
      party_type: cell('party_type').toLowerCase(),
      party_id: cell('party_id').toLowerCase(),
      currency: cell('currency').toUpperCase(),
      legacy_balance: cell('legacy_balance'),
    };
  });
}
