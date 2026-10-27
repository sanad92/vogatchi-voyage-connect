export type ItineraryValidationInput = {
  customer: string;
  destination: string;
  travelers: { adults: number; children: number; infants: number };
  start: string;
  end: string;
  lines: Array<{ description: string; quantity: number; cost: number; markup: number; currency: string }>;
  rates: Record<string, number>;
  quoteCurrency: string;
};

export function validateItinerary(input: ItineraryValidationInput): string[] {
  const errors: string[] = [];
  if (!input.customer.trim()) errors.push('اسم العميل مطلوب');
  if (!input.destination.trim()) errors.push('الوجهة مطلوبة');
  const people = Object.values(input.travelers);
  if (people.some(n => !Number.isInteger(n) || n < 0) || people.reduce((a, b) => a + b, 0) === 0) {
    errors.push('أدخل عددًا صحيحًا من المسافرين');
  }
  if ((input.start && !/^\d{4}-\d{2}-\d{2}$/.test(input.start)) || (input.end && !/^\d{4}-\d{2}-\d{2}$/.test(input.end))) errors.push('صيغة تاريخ السفر غير صحيحة');
  if (input.start && input.end && input.end < input.start) errors.push('تاريخ العودة يسبق المغادرة');
  if (!input.lines.length) errors.push('أضف خدمة واحدة على الأقل');
  input.lines.forEach((line, index) => {
    if (!line.description.trim()) errors.push('وصف الخدمة ' + (index + 1) + ' مطلوب');
    if (!Number.isInteger(line.quantity) || line.quantity < 1) errors.push('كمية الخدمة ' + (index + 1) + ' غير صحيحة');
    if (![line.cost, line.markup].every(n => Number.isFinite(n) && n >= 0 && n <= 1e12)) errors.push('تسعير الخدمة ' + (index + 1) + ' غير صحيح');
    if (line.currency !== input.quoteCurrency && !(Number.isFinite(input.rates[line.currency]) && input.rates[line.currency] > 0)) {
      errors.push('سعر صرف ' + line.currency + ' غير محدد');
    }
  });
  return errors;
}
