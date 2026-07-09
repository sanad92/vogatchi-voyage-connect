// SLA monitor: scans open conversations, marks SLA breaches, creates notifications.
// Runs on cron every 5 minutes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const now = new Date();
  const results = { scanned: 0, first_response_breaches: 0, resolution_breaches: 0, notified: 0 };

  try {
    // Fetch all SLA settings
    const { data: settingsList } = await admin
      .from('whatsapp_sla_settings')
      .select('*');

    if (!settingsList?.length) {
      return Response.json({ ok: true, ...results, note: 'no orgs configured' });
    }

    for (const s of settingsList as any[]) {
      const orgId = s.organization_id;
      const firstMs = (s.sla_first_response_minutes || 15) * 60_000;
      const resolveMs = (s.sla_resolution_minutes || 1440) * 60_000;

      // Open conversations without a first response
      const { data: convs } = await admin
        .from('whatsapp_conversations')
        .select('id, created_at, first_response_at, status, sla_breached_first_response, sla_breached_resolution, assigned_to')
        .eq('organization_id', orgId)
        .in('status', ['open', 'pending', 'active']);

      if (!convs) continue;
      results.scanned += convs.length;

      for (const c of convs as any[]) {
        const created = new Date(c.created_at).getTime();

        // First-response breach
        if (!c.first_response_at && !c.sla_breached_first_response && now.getTime() - created > firstMs) {
          await admin
            .from('whatsapp_conversations')
            .update({ sla_breached_first_response: true, priority: 'high' })
            .eq('id', c.id);
          results.first_response_breaches++;

          if (c.assigned_to) {
            await admin.from('notifications').insert({
              user_id: c.assigned_to,
              organization_id: orgId,
              type: 'sla_breach',
              priority: 'high',
              title: 'خرق SLA - وقت الاستجابة الأولى',
              message: `تم تجاوز وقت الاستجابة الأولى (${s.sla_first_response_minutes} دقيقة) لمحادثة`,
              action_url: `/whatsapp-inbox/${c.id}`,
              is_read: false,
            });
            results.notified++;
          }
        }

        // Resolution breach
        if (!c.sla_breached_resolution && now.getTime() - created > resolveMs) {
          await admin
            .from('whatsapp_conversations')
            .update({ sla_breached_resolution: true, priority: 'urgent' })
            .eq('id', c.id);
          results.resolution_breaches++;

          if (c.assigned_to) {
            await admin.from('notifications').insert({
              user_id: c.assigned_to,
              organization_id: orgId,
              type: 'sla_breach',
              priority: 'urgent',
              title: 'خرق SLA - وقت الحل',
              message: `تجاوزت المحادثة الوقت المسموح للحل (${s.sla_resolution_minutes} دقيقة)`,
              action_url: `/whatsapp-inbox/${c.id}`,
              is_read: false,
            });
            results.notified++;
          }
        }
      }
    }

    return Response.json({ ok: true, ...results });
  } catch (err) {
    console.error('sla-monitor error:', err);
    return Response.json({ ok: false, error: String(err), ...results }, { status: 500 });
  }
});
