// Submits local draft/rejected templates to Meta (WhatsApp Business) for approval.
// Converts named {{placeholders}} into Meta positional {{1}}, {{2}}... and
// attaches example values so Meta can review the template.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { WA_CORS as cors, appSecretProof, resolveSettings, scanPlaceholders } from '../_shared/whatsapp.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const MARKETING_KEYS = ['marketing', 'seasonal', 'crm_followups'];

function metaCategory(row: any): 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' {
  const raw = String(row.category || '').toUpperCase();
  if (raw === 'MARKETING' || raw === 'UTILITY' || raw === 'AUTHENTICATION') return raw as any;
  return MARKETING_KEYS.includes(String(row.category_key || '')) ? 'MARKETING' : 'UTILITY';
}

function metaLanguage(row: any): string {
  const l = String(row.language || row.locale || 'ar').trim();
  if (l.includes('_')) return l;
  if (l.toLowerCase() === 'en') return 'en_US';
  return l.toLowerCase();
}

/** Replaces named placeholders with positional ones, returning examples in order. */
function positionalize(text: string | null | undefined, previews: Record<string, any>) {
  if (!text) return { text: '', examples: [] as string[] };
  const { names } = scanPlaceholders(text);
  let out = text;
  const examples: string[] = [];
  let index = 0;
  // Keep already-positional placeholders intact by first collecting their max
  const positional = new Set<number>();
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) positional.add(Number(m[1]));
  index = positional.size ? Math.max(...positional) : 0;
  for (let i = 1; i <= index; i++) examples.push(String(previews[String(i)] ?? `مثال ${i}`));
  for (const name of names) {
    index += 1;
    out = out.replaceAll(new RegExp(`\\{\\{\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g'), `{{${index}}}`);
    examples.push(String(previews[name] ?? name.replace(/_/g, ' ')));
  }
  return { text: out, examples };
}

/** Meta rejects templates whose text starts or ends with a variable. */
function textIssues(label: string, text: string): string[] {
  const issues: string[] = [];
  const t = text.trim();
  if (/^\{\{\s*[^}]+\s*\}\}/.test(t)) issues.push(`${label}: لا يمكن أن يبدأ النص بمتغير — أضف كلمة قبله`);
  if (/\{\{\s*[^}]+\s*\}\}$/.test(t)) issues.push(`${label}: لا يمكن أن ينتهي النص بمتغير — أضف كلمة أو علامة بعده`);
  if (/\}\}\s*\{\{/.test(t)) issues.push(`${label}: لا يمكن وضع متغيرين متتاليين بدون نص بينهما`);
  return issues;
}

function validateRow(row: any): string[] {
  const issues: string[] = [];
  if (!String(row.body_text || '').trim()) issues.push('نص الرسالة مطلوب');
  else issues.push(...textIssues('نص الرسالة', String(row.body_text)));
  if (row.header_text && String(row.header_format || row.header_type || 'TEXT').toUpperCase() === 'TEXT') {
    issues.push(...textIssues('العنوان', String(row.header_text)));
  }
  if (row.footer_text && /\{\{/.test(String(row.footer_text))) issues.push('التذييل لا يدعم المتغيرات');
  return issues;
}

function buildComponents(row: any) {
  const previews = (row.preview_variables || {}) as Record<string, any>;
  const components: any[] = [];

  const headerFormat = String(row.header_format || row.header_type || 'TEXT').toUpperCase();
  if (row.header_text && headerFormat === 'TEXT') {
    const h = positionalize(String(row.header_text || '').trim(), previews);
    const comp: any = { type: 'HEADER', format: 'TEXT', text: h.text };
    if (h.examples.length) comp.example = { header_text: h.examples };
    components.push(comp);
  }

  const b = positionalize(String(row.body_text || '').trim(), previews);
  const body: any = { type: 'BODY', text: b.text };
  if (b.examples.length) body.example = { body_text: [b.examples] };
  components.push(body);

  if (row.footer_text) components.push({ type: 'FOOTER', text: String(row.footer_text).slice(0, 60) });

  if (Array.isArray(row.buttons) && row.buttons.length) {
    components.push({ type: 'BUTTONS', buttons: row.buttons });
  }
  return components;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { organizationId, templateIds, allDrafts } = await req.json();
    if (!organizationId) return json({ error: 'organizationId required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // AuthZ: caller must be a member of the organization
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: member } = await admin.from('organization_members').select('id')
      .eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) return json({ error: 'Forbidden' }, 403);

    let q = admin.from('whatsapp_templates').select('*').eq('organization_id', organizationId);
    if (Array.isArray(templateIds) && templateIds.length) q = q.in('id', templateIds);
    else if (allDrafts) q = q.is('meta_template_id', null).in('status', ['draft', 'rejected']);
    else return json({ error: 'templateIds or allDrafts required' }, 400);

    const { data: rows, error: rowsErr } = await q;
    if (rowsErr) return json({ error: rowsErr.message }, 500);
    if (!rows?.length) return json({ ok: true, submitted: 0, failed: 0, results: [] });

    const settings = await resolveSettings(admin, organizationId);
    if (!settings.waba_id) {
      return json({ error: 'WABA ID غير متوفر — أعد ربط واتساب | WABA id missing, reconnect WhatsApp' }, 400);
    }
    const proof = await appSecretProof(settings.access_token);
    const gv = settings.api_version || 'v22.0';
    const endpoint = `https://graph.facebook.com/${gv}/${settings.waba_id}/message_templates`
      + (proof ? `?appsecret_proof=${proof}` : '');

    const results: any[] = [];
    let submitted = 0, failed = 0;

    for (const row of rows) {
      if (row.meta_template_id) {
        results.push({ id: row.id, name: row.name, ok: true, skipped: 'already_on_meta' });
        continue;
      }
      const issues = validateRow(row);
      if (issues.length) {
        failed++;
        const msg = issues.join(' • ');
        await admin.from('whatsapp_templates').update({
          meta_rejection_reason: msg,
          meta_synced_at: new Date().toISOString(),
        }).eq('id', row.id);
        results.push({ id: row.id, name: row.name, ok: false, error: msg, code: 'local_validation' });
        continue;
      }

      const name = String(row.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);
      const payload = {
        name,
        language: metaLanguage(row),
        category: metaCategory(row),
        components: buildComponents(row),
      };

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        failed++;
        const msg = j?.error?.error_user_msg || j?.error?.message || 'Meta API error';
        await admin.from('whatsapp_templates').update({
          meta_rejection_reason: msg,
          meta_synced_at: new Date().toISOString(),
        }).eq('id', row.id);
        results.push({ id: row.id, name: row.name, ok: false, error: msg, code: j?.error?.code ?? null });
        continue;
      }

      submitted++;
      const status = String(j?.status || 'PENDING').toLowerCase();
      await admin.from('whatsapp_templates').update({
        name,
        language: payload.language,
        category: payload.category,
        components: payload.components,
        meta_template_id: j?.id ?? null,
        meta_status: status,
        status: status === 'approved' ? 'approved' : 'pending',
        approval_status: status,
        meta_rejection_reason: null,
        meta_synced_at: new Date().toISOString(),
        whatsapp_settings_id: settings.id,
      }).eq('id', row.id);

      results.push({ id: row.id, name, ok: true, metaId: j?.id ?? null, status });
    }

    return json({ ok: true, submitted, failed, results });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
