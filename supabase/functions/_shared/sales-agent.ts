// AI sales agent helpers: qualification brief + selling-price context.
// Never exposes internal cost, supplier codes or commission. Never confirms a booking.
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { callLovableAI, safeParseJSON, ChatMessage } from './ai-gateway.ts';

export interface SalesBrief {
  destination: string | null;
  travel_from: string | null;
  travel_to: string | null;
  adults: number | null;
  children: number | null;
  children_ages: string | null;
  budget_range: string | null;
  trip_type: string | null;
  board_preference: string | null;
  notes: string | null;
  readiness: string;
}

const EMPTY: SalesBrief = {
  destination: null, travel_from: null, travel_to: null, adults: null, children: null,
  children_ages: null, budget_range: null, trip_type: null, board_preference: null,
  notes: null, readiness: 'collecting',
};

export async function loadBrief(db: SupabaseClient, orgId: string, conversationId: string): Promise<SalesBrief> {
  const { data } = await db.from('ai_sales_briefs').select('*')
    .eq('organization_id', orgId).eq('conversation_id', conversationId).maybeSingle();
  return data ? { ...EMPTY, ...data } as SalesBrief : { ...EMPTY };
}

/** Catalog rows matching the destination mentioned by the customer (selling prices only). */
export async function matchCatalog(
  db: SupabaseClient, orgId: string, brief: SalesBrief, text: string,
): Promise<any[]> {
  const { data: destinations } = await db.from('ai_price_catalog')
    .select('destination').eq('organization_id', orgId);
  const names = Array.from(new Set((destinations || []).map((d: any) => d.destination))) as string[];
  const haystack = `${brief.destination || ''} ${text}`;
  const matched = names.filter((d) => d && haystack.includes(d));
  let query = db.from('ai_price_catalog')
    .select('destination,name,rating,board,valid_from,valid_to,price_single,price_double,price_triple,currency,unit,notes,supplement,extra')
    .eq('organization_id', orgId).order('price_double', { ascending: true }).limit(matched.length ? 25 : 0);
  if (matched.length) query = query.in('destination', matched);
  const { data } = await query;
  return data || [];
}

export function catalogText(rows: any[], available: string[]): string {
  if (!rows.length) {
    return available.length
      ? `الوجهات المتاحة في دليل الأسعار المعتمد: ${available.join('، ')}. اسأل العميل عن وجهته قبل ذكر أي سعر.`
      : 'لا يوجد دليل أسعار محدّث؛ اجمع الطلب وسلّمه للموظف دون ذكر أسعار.';
  }
  const lines = rows.slice(0, 25).map((r) => {
    const period = r.valid_from && r.valid_to ? ` | الفترة ${r.valid_from} إلى ${r.valid_to}` : '';
    const unit = r.unit === 'per_person' ? 'للفرد' : 'للغرفة/الليلة';
    const prices = [
      r.price_single ? `سنجل ${r.price_single}` : null,
      r.price_double ? `دبل ${r.price_double}` : null,
      r.price_triple ? `تربل ${r.price_triple}` : null,
    ].filter(Boolean).join(' • ');
    return `- ${r.name}${r.rating ? ` (${r.rating})` : ''} — ${r.destination}${period} | ${r.board || ''} | ${prices} ${r.currency} ${unit}${r.notes ? ` | ${r.notes}` : ''}`;
  });
  return `أسعار البيع المعتمدة (سعر بيع نهائي للعميل، لا تذكر أي تكلفة أو كود مورد):\n${lines.join('\n')}`;
}

export function salesSystemPrompt(params: {
  basePrompt: string; knowledge: string | null; brief: SalesBrief; catalog: string; companyName: string;
}): string {
  const known = Object.entries({
    'الوجهة': params.brief.destination, 'تاريخ البداية': params.brief.travel_from,
    'تاريخ النهاية': params.brief.travel_to, 'عدد الكبار': params.brief.adults,
    'عدد الأطفال': params.brief.children, 'أعمار الأطفال': params.brief.children_ages,
    'الميزانية': params.brief.budget_range, 'نوع الرحلة': params.brief.trip_type,
    'نظام الإقامة': params.brief.board_preference,
  }).filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`).join(' | ');

  return [
    params.basePrompt,
    `أنت مستشار مبيعات سفر فاخر في ${params.companyName}. أسلوبك راقٍ وموجز وواثق، وتتحدث بلغة العميل.`,
    'مهمتك: تأهيل الطلب (الوجهة، التواريخ، عدد المسافرين وأعمار الأطفال، الميزانية، نوع الرحلة ونظام الإقامة)، ثم اقتراح خيارين أو ثلاثة مناسبة من أسعار البيع المعتمدة فقط.',
    'اسأل عن معلومة ناقصة واحدة في كل رسالة، ولا تعد سؤال العميل عن معلومة ذكرها.',
    known ? `المعلومات المؤكدة حتى الآن: ${known}` : 'لم تُجمع أي معلومات بعد.',
    params.catalog,
    'قواعد إلزامية: لا تخترع أسعارًا أو فنادق غير موجودة في القائمة أعلاه. لا تؤكد التوافر أو الحجز. لا تذكر التكلفة الداخلية أو العمولة أو أكواد الموردين. لا تطلب بيانات بطاقة أو كلمة مرور. وضّح دائمًا أن السعر مبدئي ويخضع لتأكيد التوافر من مستشارك، وأن العرض الرسمي والتأكيد النهائي من موظف المبيعات.',
    params.knowledge ? `مرجع الشركة المعتمد:\n${params.knowledge}` : '',
  ].filter(Boolean).join('\n');
}

/** Extracts the qualification brief from the conversation. Returns null when extraction fails. */
export async function extractBrief(params: {
  history: ChatMessage[]; model: string; current: SalesBrief;
}): Promise<Partial<SalesBrief> | null> {
  const schema = `{"destination":string|null,"travel_from":"YYYY-MM-DD"|null,"travel_to":"YYYY-MM-DD"|null,"adults":number|null,"children":number|null,"children_ages":string|null,"budget_range":string|null,"trip_type":string|null,"board_preference":string|null,"notes":string|null,"readiness":"collecting"|"ready_for_quote"}`;
  try {
    const raw = await callLovableAI({
      model: params.model,
      jsonMode: true,
      messages: [
        { role: 'system', content: `استخرج بيانات طلب السفر من المحادثة. أعد JSON فقط بهذا الشكل: ${schema}. استخدم null لأي معلومة لم يذكرها العميل صراحة. اجعل readiness = "ready_for_quote" فقط إذا عُرفت الوجهة والتواريخ وعدد المسافرين. البيانات الحالية: ${JSON.stringify(params.current)}` },
        ...params.history,
      ],
    });
    const parsed = safeParseJSON<Partial<SalesBrief>>(raw);
    if (!parsed) return null;
    const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const int = (v: unknown) => (typeof v === 'number' && isFinite(v) && v >= 0 && v < 100 ? Math.round(v) : null);
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : null);
    return {
      destination: text(parsed.destination), travel_from: date(parsed.travel_from), travel_to: date(parsed.travel_to),
      adults: int(parsed.adults), children: int(parsed.children), children_ages: text(parsed.children_ages),
      budget_range: text(parsed.budget_range), trip_type: text(parsed.trip_type),
      board_preference: text(parsed.board_preference), notes: text(parsed.notes),
      readiness: parsed.readiness === 'ready_for_quote' ? 'ready_for_quote' : 'collecting',
    };
  } catch (e) {
    console.error('brief extraction failed', String((e as any)?.message || e));
    return null;
  }
}

/** Merges only newly discovered values; never erases a confirmed answer. */
export function mergeBrief(current: SalesBrief, next: Partial<SalesBrief>): Partial<SalesBrief> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof SalesBrief)[]) {
    if (key === 'readiness') continue;
    const value = next[key];
    if (value !== null && value !== undefined && value !== '') out[key] = value;
    else if (current[key] !== null && current[key] !== undefined) out[key] = current[key];
  }
  out.readiness = next.readiness === 'ready_for_quote' ? 'ready_for_quote' : current.readiness === 'ready_for_quote' ? 'ready_for_quote' : 'collecting';
  return out as Partial<SalesBrief>;
}
