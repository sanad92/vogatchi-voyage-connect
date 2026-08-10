// Syncs approved/pending/rejected/paused templates from the connected WABA and
// stores the raw Meta components + variable counts so sends can be validated.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { WA_CORS as cors, appSecretProof, countPlaceholders, resolveSettings } from '../_shared/whatsapp.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { organizationId } = await req.json();
    if (!organizationId) return json({ error: 'organizationId required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // AuthZ: caller must be a member of the organization
    const authHeader = req.headers.get('Authorization') ?? '';
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: member } = await admin.from('organization_members').select('id')
      .eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
    if (!member) return json({ error: 'Forbidden' }, 403);

    const settings = await resolveSettings(admin, organizationId);
    if (!settings.waba_id) return json({ error: 'WABA ID غير متوفر — أعد ربط واتساب | WABA id missing, reconnect WhatsApp' }, 400);

    const proof = await appSecretProof(settings.access_token);
    const gv = settings.api_version || 'v22.0';
    const url = `https://graph.facebook.com/${gv}/${settings.waba_id}/message_templates`
      + `?fields=id,name,language,status,category,rejected_reason,components&limit=250`
      + (proof ? `&appsecret_proof=${proof}` : '');

    const r = await fetch(url, { headers: { Authorization: `Bearer ${settings.access_token}` } });
    const j = await r.json();
    if (!r.ok) return json({ error: j?.error?.message || 'Meta API error', details: j?.error ?? j }, 502);

    const metaTemplates: any[] = j.data ?? [];
    let updated = 0, created = 0;
    const seen: string[] = [];

    for (const mt of metaTemplates) {
      const status = String(mt.status || '').toLowerCase(); // approved|pending|rejected|paused|disabled
      const components = Array.isArray(mt.components) ? mt.components : [];
      const bodyComp = components.find((c: any) => String(c.type).toUpperCase() === 'BODY');
      const headerComp = components.find((c: any) => String(c.type).toUpperCase() === 'HEADER');
      const footerComp = components.find((c: any) => String(c.type).toUpperCase() === 'FOOTER');
      const buttonsComp = components.find((c: any) => String(c.type).toUpperCase() === 'BUTTONS');
      const headerFormat = String(headerComp?.format ?? 'TEXT').toUpperCase();

      const payload: Record<string, unknown> = {
        organization_id: organizationId,
        whatsapp_settings_id: settings.id,
        name: mt.name,
        language: mt.language,
        category: String(mt.category || '').toUpperCase(),
        status,
        meta_template_id: mt.id,
        meta_status: status,
        meta_rejection_reason: mt.rejected_reason && mt.rejected_reason !== 'NONE' ? mt.rejected_reason : null,
        meta_synced_at: new Date().toISOString(),
        components,
        body_text: bodyComp?.text ?? '',
        header_text: headerComp?.text ?? null,
        header_type: headerFormat.toLowerCase(),
        header_format: headerFormat,
        footer_text: footerComp?.text ?? null,
        buttons: buttonsComp?.buttons ?? null,
        body_variable_count: countPlaceholders(bodyComp?.text),
        header_variable_count: headerFormat === 'TEXT' ? countPlaceholders(headerComp?.text) : 0,
      };

      const { data: existing } = await admin.from('whatsapp_templates')
        .select('id').eq('organization_id', organizationId)
        .eq('name', mt.name).eq('language', mt.language).maybeSingle();

      if (existing) {
        await admin.from('whatsapp_templates').update(payload).eq('id', existing.id);
        seen.push(existing.id);
        updated++;
      } else {
        const { data: ins } = await admin.from('whatsapp_templates').insert(payload).select('id').maybeSingle();
        if (ins?.id) seen.push(ins.id);
        created++;
      }
    }

    // Templates that vanished from Meta are no longer sendable
    if (seen.length) {
      await admin.from('whatsapp_templates')
        .update({ meta_status: 'deleted', status: 'rejected', meta_synced_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .not('meta_template_id', 'is', null)
        .not('id', 'in', `(${seen.join(',')})`);
    }

    return json({ ok: true, total: metaTemplates.length, updated, created });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
