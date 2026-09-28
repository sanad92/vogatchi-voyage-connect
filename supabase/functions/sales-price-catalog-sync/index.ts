// Imports the company selling-price sheet into the AI sales agent price catalog.
// Reads Google Sheets through the Lovable connector gateway. Selling prices only.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/ai-gateway.ts';
import { requireOrgMember, authErrorResponse } from '../_shared/auth.ts';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const SKIP_TABS = ['سجل التحديث', 'أكواد الموردين', 'دليل الأسعار'];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function sheetIdFrom(input: string): string | null {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(input.trim()) ? input.trim() : null;
}

async function gateway(path: string, params: Record<string, string | string[]> = {}) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const connKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  if (!lovableKey || !connKey) throw new Error('لم يتم ربط حساب Google Sheets بالنظام');
  const url = new URL(`${GATEWAY}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString().replace(/%21/g, '!').replace(/%3A/g, ':'), {
    headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': connKey },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Sheets gateway failed [${res.status}]: ${text}`);
    throw new Error(`تعذّر قراءة ملف الأسعار (${res.status})`);
  }
  return JSON.parse(text);
}

const serialToDate = (v: unknown): string | null => {
  if (typeof v !== 'number' || v < 20000 || v > 90000) return null;
  const ms = Math.round((v - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
};

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number(v.replace(/[^\d.]/g, ''));
    return isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  return s.length ? s : null;
};

type Row = Record<string, unknown>;

function parseTab(tab: string, values: unknown[][]): Row[] {
  const headerIndex = values.findIndex((r) => (r || []).some((c) => typeof c === 'string' && (c.trim() === 'الفندق' || c.trim() === 'الكروز')));
  if (headerIndex < 0) return [];
  const headers = (values[headerIndex] as string[]).map((h) => (typeof h === 'string' ? h.trim() : ''));
  const at = (row: unknown[], title: string) => {
    const i = headers.findIndex((h) => h === title);
    return i < 0 ? undefined : row[i];
  };
  const isCruise = headers.includes('الكروز');
  const rows: Row[] = [];
  for (let i = headerIndex + 1; i < values.length; i++) {
    const row = values[i] || [];
    const name = str(at(row, isCruise ? 'الكروز' : 'الفندق'));
    if (!name) continue;
    const single = num(at(row, isCruise ? 'سعر SGL' : 'سنجل'));
    const double = num(at(row, isCruise ? 'سعر DBL / فرد' : 'دبل'));
    const triple = num(at(row, isCruise ? 'سعر TRPL / فرد' : 'تربل'));
    if (!single && !double && !triple) continue;
    rows.push({
      source_tab: tab,
      source_row: i + 1,
      category: isCruise ? 'cruise' : 'hotel',
      destination: isCruise ? 'نايل كروز' : tab,
      name,
      rating: str(at(row, isCruise ? 'التصنيف' : 'التصنيف | الكود')),
      board: str(at(row, isCruise ? 'الوجبات' : 'نوع الإقامة')),
      valid_from: serialToDate(at(row, 'من')),
      valid_to: serialToDate(at(row, 'إلى')),
      price_single: single,
      price_double: double,
      price_triple: triple,
      currency: 'EGP',
      unit: isCruise ? 'per_person' : 'per_room_per_night',
      notes: str(at(row, isCruise ? 'سياسة الأطفال' : 'ملاحظات')),
      supplement: str(at(row, 'سابلمنت الغرف')),
      extra: isCruise
        ? {
          duration: str(at(row, 'المدة')), route: str(at(row, 'المسار')),
          sailing_day: str(at(row, 'يوم الإبحار')), season: str(at(row, 'من')),
        }
        : {},
      synced_at: new Date().toISOString(),
    });
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let runId: string | undefined;
  try {
    const { organization_id, sheet } = await req.json();
    const user = await requireOrgMember(req, db, organization_id);

    const { data: settings } = await db.from('whatsapp_chatbot_settings')
      .select('price_sheet_id').eq('organization_id', organization_id).maybeSingle();
    const spreadsheetId = sheetIdFrom(String(sheet || settings?.price_sheet_id || ''));
    if (!spreadsheetId) return json({ error: 'رابط ملف الأسعار غير صحيح' }, 400);

    const { data: run, error: runError } = await db.from('ai_price_catalog_syncs').insert({
      organization_id, spreadsheet_id: spreadsheetId, started_by: user.id, status: 'running',
    }).select('id').single();
    if (runError) throw runError;
    runId = run.id;

    const meta = await gateway(`/spreadsheets/${spreadsheetId}`, { fields: 'sheets.properties.title' });
    const tabs: string[] = (meta.sheets || [])
      .map((s: any) => s?.properties?.title).filter(Boolean)
      .filter((t: string) => !SKIP_TABS.includes(t) && !t.startsWith('RAW'));
    if (!tabs.length) throw new Error('لا توجد صفحات أسعار في الملف');

    const all: Row[] = [];
    for (const tab of tabs) {
      const data = await gateway(`/spreadsheets/${spreadsheetId}/values/${tab}!A1:R1000`, { valueRenderOption: 'UNFORMATTED_VALUE' });
      all.push(...parseTab(tab, (data.values || []) as unknown[][]));
    }
    if (!all.length) throw new Error('لم يتم العثور على أسعار في الملف');

    await db.from('ai_price_catalog').delete().eq('organization_id', organization_id);
    for (let i = 0; i < all.length; i += 400) {
      const chunk = all.slice(i, i + 400).map((r) => ({ ...r, organization_id }));
      const { error } = await db.from('ai_price_catalog').insert(chunk);
      if (error) throw error;
    }

    await db.from('ai_price_catalog_syncs').update({
      status: 'succeeded', rows_imported: all.length, tabs_imported: tabs.length, finished_at: new Date().toISOString(),
    }).eq('id', runId);
    await db.from('whatsapp_chatbot_settings').update({ price_sheet_id: spreadsheetId })
      .eq('organization_id', organization_id);

    return json({ ok: true, rows: all.length, tabs: tabs.length });
  } catch (e: any) {
    const message = String(e?.message || e);
    if (runId) {
      await db.from('ai_price_catalog_syncs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('id', runId);
    }
    return authErrorResponse(e, corsHeaders as Record<string, string>) || json({ error: message }, 500);
  }
});
