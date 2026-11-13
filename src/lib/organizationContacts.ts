export const OWNER_NAME_ERROR = 'أدخل اسم المسؤول من حرفين إلى 120 حرفًا.';
export const OWNER_PHONE_ERROR = 'أدخل رقم هاتف صحيح لمسؤول المؤسسة.';
export const COMPANY_PHONE_ERROR = 'أدخل رقم هاتف صحيح للمؤسسة.';
export const COMPANY_EMAIL_ERROR = 'أدخل بريدًا إلكترونيًا صحيحًا للمؤسسة.';

export function normalizeContactPhone(value: string) {
  if (value.length > 32) return null;
  const phone = value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(phone) ? phone : null;
}

export function validContactName(value: string) {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 120;
}

export function validContactEmail(value: string) {
  const email = value.trim();
  return email.length <= 255 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}

export function contactValidationError(name: string, ownerPhone: string, companyPhone: string, companyEmail: string) {
  if (!validContactName(name)) return OWNER_NAME_ERROR;
  if (!normalizeContactPhone(ownerPhone)) return OWNER_PHONE_ERROR;
  if (!normalizeContactPhone(companyPhone)) return COMPANY_PHONE_ERROR;
  if (!validContactEmail(companyEmail)) return COMPANY_EMAIL_ERROR;
  return null;
}
