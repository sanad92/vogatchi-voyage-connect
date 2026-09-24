/**
 * Template variable planning for approved WhatsApp templates.
 *
 * Meta templates carry either named placeholders ({{customer_name}}) or
 * positional ones ({{1}}, {{2}}...). For every slot we decide whether the
 * system fills it automatically from stored records (organization name,
 * registered customer details) or whether a human must type a value.
 *
 * Auto slots keep their token (e.g. "{{customer_name}}") as the stored value so
 * the server resolves it per recipient at send time.
 */

export interface TemplateSlot {
  /** Placeholder as written in the template: a name or a position number. */
  token: string;
  /** Component the slot belongs to. */
  section: 'header' | 'body';
  /** Zero-based index inside the component's parameter list. */
  index: number;
  /** Arabic label shown to staff. */
  label: string;
  /** When set, the system fills this slot itself with this token. */
  auto: string | null;
}

/** Variables the system always resolves on its own at send time. */
export const AUTO_TOKENS: Record<string, string> = {
  customer_name: 'اسم العميل المسجل',
  customer_first_name: 'الاسم الأول للعميل',
  customer_phone: 'رقم هاتف العميل',
  customer_email: 'بريد العميل',
  company_name: 'اسم المؤسسة',
  organization_name: 'اسم المؤسسة',
  company_phone: 'رقم الإرسال',
  date: 'تاريخ اليوم',
};

const scan = (text?: string | null) => {
  const positional = new Set<number>();
  const names: string[] = [];
  for (const m of String(text || '').matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)) {
    const t = m[1];
    if (/^\d+$/.test(t)) positional.add(Number(t));
    else if (!names.includes(t)) names.push(t);
  }
  const max = positional.size ? Math.max(...positional) : 0;
  return [...Array.from({ length: max }, (_, i) => String(i + 1)), ...names];
};

const componentText = (tpl: any, type: 'BODY' | 'HEADER'): string | null => {
  const comps: any[] = Array.isArray(tpl?.components) ? tpl.components : [];
  const c = comps.find((x: any) => String(x?.type).toUpperCase() === type);
  if (c?.text) return c.text;
  return type === 'BODY' ? tpl?.body_text ?? null : tpl?.header_text ?? null;
};

const headerIsText = (tpl: any): boolean => {
  const comps: any[] = Array.isArray(tpl?.components) ? tpl.components : [];
  const c = comps.find((x: any) => String(x?.type).toUpperCase() === 'HEADER');
  const fmt = String(c?.format ?? tpl?.header_format ?? 'TEXT').toUpperCase();
  return fmt === 'TEXT';
};

/** Sensible automatic value for the first positional slots of a template. */
const POSITIONAL_AUTO = ['customer_name', 'company_name'];

export const templateSlots = (tpl: any): TemplateSlot[] => {
  if (!tpl) return [];
  const slots: TemplateSlot[] = [];

  const push = (section: 'header' | 'body', tokens: string[]) => {
    tokens.forEach((token, index) => {
      const named = !/^\d+$/.test(token);
      const autoKey = named
        ? (AUTO_TOKENS[token.toLowerCase()] ? token.toLowerCase() : null)
        : (section === 'body' ? POSITIONAL_AUTO[index] ?? null : null);
      slots.push({
        token,
        section,
        index,
        label: named
          ? (AUTO_TOKENS[token.toLowerCase()] || token)
          : `المتغير رقم ${token}${section === 'header' ? ' (العنوان)' : ''}`,
        auto: autoKey ? `{{${autoKey}}}` : null,
      });
    });
  };

  if (headerIsText(tpl)) push('header', scan(componentText(tpl, 'HEADER')));
  push('body', scan(componentText(tpl, 'BODY')));
  return slots;
};

const slotKey = (s: TemplateSlot) => `${s.section}:${s.index}`;

export const slotStorageKey = slotKey;

/**
 * Builds the value arrays stored on the campaign. Auto slots keep their token so
 * each recipient gets their own name; manual slots keep the typed value.
 */
export const buildTemplateVariables = (
  tpl: any,
  manual: Record<string, string>,
): { body: string[]; header: string[] } => {
  const body: string[] = [];
  const header: string[] = [];
  for (const s of templateSlots(tpl)) {
    const value = s.auto ?? (manual[slotKey(s)] || '').trim();
    (s.section === 'body' ? body : header).push(value);
  }
  return { body, header };
};

/** Preview text with auto tokens replaced by sample/real values. */
export const previewTemplate = (
  tpl: any,
  manual: Record<string, string>,
  sample: Record<string, string>,
): string => {
  const parts = [componentText(tpl, 'HEADER'), componentText(tpl, 'BODY'), tpl?.footer_text]
    .filter(Boolean)
    .join('\n');
  const slots = templateSlots(tpl);
  return parts.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (match, token: string) => {
    const key = String(token).toLowerCase();
    if (/^\d+$/.test(key)) {
      const s = slots.find((x) => x.token === key);
      const raw = s?.auto ? s.auto : manual[s ? slotKey(s) : ''] || '';
      return resolveSample(raw || match, sample);
    }
    if (AUTO_TOKENS[key]) return sample[key] || match;
    const s = slots.find((x) => x.token === token);
    return resolveSample(manual[s ? slotKey(s) : ''] || match, sample);
  });
};

const resolveSample = (value: string, sample: Record<string, string>) =>
  value.replace(/\{\{\s*([a-z_0-9]+)\s*\}\}/gi, (m, k: string) => sample[String(k).toLowerCase()] || m);

/** True when every manual slot has a value. */
export const missingSlots = (tpl: any, manual: Record<string, string>): TemplateSlot[] =>
  templateSlots(tpl).filter((s) => !s.auto && !(manual[slotKey(s)] || '').trim());
