export interface WhatsAppLeadDraft {
  intent?: 'hotel' | 'flight' | 'visa' | 'package' | 'transport';
  destination_city?: string;
  check_in_date?: string;
  check_out_date?: string;
  adults?: number;
  children?: number;
  children_ages?: number[];
  budget_amount?: number;
  budget_currency?: string;
}

const identityTerms = /جواز|بطاقة|رقم قومي|الرقم القومي|رقم الهوية|تاريخ الميلاد|passport|national[ -]?id|birth\s*date|date of birth/i;
const fullDate = '(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})';
const tripDates = new RegExp(`(?:من|from)\\s+${fullDate}\\s+(?:إلى|الى|حتى|لحد|لغاية|لـ?|to)\\s*${fullDate}`, 'i');
const arrival = new RegExp(`(?:تاريخ الوصول|تاريخ السفر|الوصول|check[ -]?in)\\s*[:：-]?\\s*${fullDate}`, 'i');
const departure = new RegExp(`(?:تاريخ المغادرة|تاريخ العودة|المغادرة|العودة|check[ -]?out)\\s*[:：-]?\\s*${fullDate}`, 'i');
const destination = /(?:^|\s)(?:الوجهة|destination)\s*[:：-]\s*([^،,;:.\n\d]+)/i;
const destinationInRequest = /(?:فندق|إقامة|اقامة|باقة|رحلة|طيران|hotel|flight)\s+(?:في|إلى|الى|in|to)\s+([^،,;:.\n\d]+)/i;
const adultCount = /(?:عدد البالغين|البالغين|adults)\s*[:：]?\s*(\d{1,2})(?!\d)|(?:^|[^\d])(\d{1,2})\s*(?:بالغ(?:ين)?|كبار|adults?)/i;
const childCount = /(?:عدد الأطفال|الأطفال|الاطفال|children)\s*[:：]?\s*(\d{1,2})(?!\d)|(?:^|[^\d])(\d{1,2})\s*(?:طفل(?:اً|ا)?|أطفال|اطفال|children)/i;
const childAges = /(?:أعمار الأطفال|اعمار الاطفال|children ages)\s*[:：]\s*([\d\s,،]+)(?=$|[^\d])/i;
const declaredBudget = /(?:الميزانية|ميزانية|budget)\s*[:：]?\s*(\d{1,8}(?:\.\d{1,2})?)\s*(EGP|USD|EUR|SAR|AED|جنيه مصري|جنيه|دولار|ريال سعودي|درهم إماراتي|يورو)(?=$|[\s،,.!?؛])/i;

const services = [
  ['package', /باقة|برنامج سياحي|package/i],
  ['visa', /تأشيرة|تاشيرة|\bvisa\b/i],
  ['hotel', /فندق|إقامة|اقامة|\bhotel\b/i],
  ['flight', /طيران|رحلة جوية|\bflight\b/i],
  ['transport', /انتقالات|توصيل المطار|سيارة خاصة|\btransfer\b/i],
] as const;

const currencies: Readonly<Record<string, string>> = {
  'جنيه مصري': 'EGP', 'جنيه': 'EGP', 'دولار': 'USD', 'ريال سعودي': 'SAR', 'درهم إماراتي': 'AED', 'يورو': 'EUR',
};

function normalizeText(value: string) {
  return value.slice(0, 1000)
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0));
}

function isoDate(value?: string) {
  if (!value) return undefined;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  // A slash date with both day and month at most 12 is ambiguous.
  if (slash && Number(slash[1]) <= 12 && Number(slash[2]) <= 12) return undefined;
  const iso = slash ? `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}` : value;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : undefined;
}

function travelDestination(value?: string) {
  const candidate = value?.split(/\s+(?:من|يوم|تاريخ|لمدة|لعدد|with|from|on)\s+/i)[0].trim();
  return candidate && /^[\p{L}\p{M}][\p{L}\p{M}\s'-]{1,55}$/u.test(candidate) ? candidate.replace(/\s+/g, ' ') : undefined;
}

/** The input is newest-first and contains only incoming plain text. */
export function extractWhatsAppLeadDraft(messages: readonly string[]): WhatsAppLeadDraft {
  const draft: WhatsAppLeadDraft = {};
  for (const input of messages.slice(0, 30)) {
    const message = normalizeText(input);
    if (identityTerms.test(message)) continue;
    if (!draft.intent) draft.intent = services.find(([, pattern]) => pattern.test(message))?.[0];
    if (!draft.destination_city) draft.destination_city = travelDestination(
      message.match(destination)?.[1] ?? message.match(destinationInRequest)?.[1],
    );
    // Take dates from one message to avoid combining a new arrival date with an old departure.
    if (!draft.check_in_date && !draft.check_out_date) {
      const range = message.match(tripDates);
      const start = isoDate(range?.[1] ?? message.match(arrival)?.[1]);
      const end = isoDate(range?.[2] ?? message.match(departure)?.[1]);
      if (start) draft.check_in_date = start;
      if (end && (!start || end >= start)) draft.check_out_date = end;
    }
    if (draft.adults === undefined) {
      const match = message.match(adultCount);
      const count = Number(match?.[1] ?? match?.[2]);
      if (count >= 1 && count <= 99) draft.adults = count;
    }
    if (draft.children === undefined) {
      const ageList = message.match(childAges);
      const match = (ageList ? message.replace(ageList[0], ' ') : message).match(childCount);
      const count = Number(match?.[1] ?? match?.[2]);
      if (count >= 0 && count <= 20) {
        draft.children = count;
        const ages = ageList?.[1].trim().split(/[\s,،]+/).map(Number);
        if (ages?.length === count && ages.every((age) => Number.isInteger(age) && age >= 0 && age <= 17)) {
          draft.children_ages = ages;
        }
      }
    }
    if (draft.budget_amount === undefined) {
      const match = message.match(declaredBudget);
      if (match && Number(match[1]) > 0) {
        draft.budget_amount = Number(match[1]);
        draft.budget_currency = currencies[match[2]] ?? match[2].toUpperCase();
      }
    }
  }

  return Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined));
}
