import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/amr': 'amr',
  'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/webm': 'webm',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function normalizeMime(m: string | null | undefined): string | null {
  if (!m) return null;
  return m.split(';')[0].trim().toLowerCase() || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validate the caller
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messageId } = await req.json();
    if (!messageId || typeof messageId !== 'string') {
      return new Response(JSON.stringify({ error: 'messageId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the message
    const { data: message, error: msgErr } = await supabase
      .from('whatsapp_messages')
      .select('id, organization_id, conversation_id, message_id, media_provider_id, media_mime_type, media_storage_path, media_download_attempts')
      .eq('id', messageId)
      .maybeSingle();

    if (msgErr || !message) {
      return new Response(JSON.stringify({ error: 'message not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller belongs to the same organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('organization_id', message.organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message.media_provider_id) {
      // Mark as permanently failed
      await supabase
        .from('whatsapp_messages')
        .update({
          media_download_status: 'failed',
          media_download_error: 'no media_provider_id — cannot retry',
          media_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      return new Response(JSON.stringify({ error: 'no media provider id' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch org settings for access token
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('access_token, api_version')
      .eq('organization_id', message.organization_id)
      .maybeSingle();

    if (!settings?.access_token) {
      await supabase
        .from('whatsapp_messages')
        .update({
          media_download_status: 'failed',
          media_download_error: 'no access token configured for org',
          media_download_attempts: (message.media_download_attempts ?? 0) + 1,
          media_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      return new Response(JSON.stringify({ error: 'no access token' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = settings.access_token;
    const gv = settings.api_version || 'v22.0';

    try {
      // 1) meta lookup
      const metaRes = await fetch(`https://graph.facebook.com/${gv}/${message.media_provider_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) {
        const body = await metaRes.text().catch(() => '');
        throw new Error(`meta media meta ${metaRes.status}: ${body.slice(0, 200)}`);
      }
      const meta = await metaRes.json();
      const mimeType = normalizeMime(meta.mime_type)
        || normalizeMime(message.media_mime_type)
        || 'application/octet-stream';

      // 2) binary download
      const fileRes = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!fileRes.ok) {
        const body = await fileRes.text().catch(() => '');
        throw new Error(`meta media download ${fileRes.status}: ${body.slice(0, 200)}`);
      }
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      if (bytes.byteLength === 0) throw new Error('downloaded empty file');

      // 3) upload
      const rawExt = MIME_EXT[mimeType] || mimeType.split('/')[1] || 'bin';
      const ext = rawExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
      const path = `${message.organization_id}/${message.conversation_id}/${message.message_id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('whatsapp-media')
        .upload(path, bytes, { contentType: mimeType, upsert: true });
      if (upErr) throw new Error(`storage upload: ${upErr.message ?? String(upErr)}`);

      // 4) update row
      await supabase
        .from('whatsapp_messages')
        .update({
          media_storage_path: path,
          media_mime_type: mimeType,
          media_download_status: 'success',
          media_download_error: null,
          media_download_attempts: (message.media_download_attempts ?? 0) + 1,
          media_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      return new Response(JSON.stringify({ success: true, path, mimeType }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      const errMsg = String((e as Error)?.message ?? e).slice(0, 500);
      await supabase
        .from('whatsapp_messages')
        .update({
          media_download_status: 'failed',
          media_download_error: errMsg,
          media_download_attempts: (message.media_download_attempts ?? 0) + 1,
          media_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      console.error('[retry-whatsapp-media] failed', { messageId: message.id, error: errMsg });
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[retry-whatsapp-media] unexpected', error);
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
