export function normalizeCustomerPhone(phone: string): string {
  const digits = phone?.replace(/\D/g, '') || '';
  if (/^201\d{9}$/.test(digits)) return digits;
  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^1\d{9}$/.test(digits)) return `20${digits}`;
  return digits;
}
