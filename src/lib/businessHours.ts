/**
 * Business hours + SLA helpers.
 * All checks use the org's timezone via Intl.
 */

export interface DayHours {
  enabled: boolean;
  open: string;  // "HH:mm"
  close: string; // "HH:mm"
}

export type BusinessHours = Record<'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat', DayHours>;

const DAY_KEYS: Array<keyof BusinessHours> = ['sun','mon','tue','wed','thu','fri','sat'];

export const DAY_LABELS: Record<keyof BusinessHours, string> = {
  sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء',
  thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
};

const getPartsInTz = (date: Date, timeZone: string) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const weekday = get('weekday').toLowerCase().slice(0, 3);
  const hh = parseInt(get('hour'), 10);
  const mm = parseInt(get('minute'), 10);
  return { day: weekday as keyof BusinessHours, minutes: hh * 60 + mm };
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const isWithinBusinessHours = (
  now: Date,
  hours: BusinessHours,
  timezone: string,
): boolean => {
  try {
    const { day, minutes } = getPartsInTz(now, timezone);
    const cfg = hours[day];
    if (!cfg?.enabled) return false;
    return minutes >= toMinutes(cfg.open) && minutes < toMinutes(cfg.close);
  } catch {
    return true;
  }
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  sun: { enabled: true, open: '09:00', close: '18:00' },
  mon: { enabled: true, open: '09:00', close: '18:00' },
  tue: { enabled: true, open: '09:00', close: '18:00' },
  wed: { enabled: true, open: '09:00', close: '18:00' },
  thu: { enabled: true, open: '09:00', close: '18:00' },
  fri: { enabled: false, open: '09:00', close: '18:00' },
  sat: { enabled: false, open: '09:00', close: '18:00' },
};

export { DAY_KEYS };
