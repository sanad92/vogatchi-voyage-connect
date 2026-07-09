import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifySignature(body: Uint8Array, signature: string, appSecret: string): Promise<boolean> {
  if (!signature || !appSecret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const bodyBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const mac = hexEncode(await crypto.subtle.sign('HMAC', key, bodyBuffer));
  const expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return timingSafeEqual(mac, expected);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const expected = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
      if (!expected) {
        console.error('[whatsapp-webhook] WHATSAPP_VERIFY_TOKEN not configured');
        return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
      }
      if (mode !== 'subscribe' || !token || token !== expected) {
        console.error('[whatsapp-webhook] verification failed', { mode, tokenPresent: !!token });
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
      return new Response(challenge ?? '', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (req.method === 'POST') {
      const appSecret = Deno.env.get('META_APP_SECRET') ?? Deno.env.get('WHATSAPP_APP_SECRET');
      const signature = req.headers.get('X-Hub-Signature-256') ?? '';
      const rawBody = new Uint8Array(await req.arrayBuffer());

      if (appSecret) {
        const valid = await verifySignature(rawBody, signature, appSecret);
        if (!valid) {
          console.error('Invalid webhook signature');
          return new Response('Forbidden', { status: 403, headers: corsHeaders });
        }
      } else {
        console.warn('APP_SECRET missing - skipping signature verification');
      }

      const body = JSON.parse(new TextDecoder().decode(rawBody));
      console.log('WhatsApp Webhook received:', JSON.stringify(body));

      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry ?? []) {
          const wabaId: string = entry.id;
          // Route to the org that owns this WABA
          const { data: settings } = await supabase
            .from('whatsapp_settings')
            .select('id, organization_id')
            .eq('waba_id', wabaId)
            .maybeSingle();

          const organizationId = settings?.organization_id ?? null;
          if (!organizationId) {
            console.warn('No org mapped for waba_id', wabaId);
            continue;
          }

          for (const change of entry.changes ?? []) {
            if (change.field === 'messages') {
              await processMessage(change.value, supabase, organizationId);
            }
          }
        }
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

async function processMessage(messageData: any, supabase: any, organizationId: string) {
  try {
    if (messageData.messages) {
      for (const message of messageData.messages) {
        const phoneNumber = normalizePhone(message.from);
        if (!phoneNumber) {
          console.warn('skip message: empty phone');
          continue;
        }
        const nowIso = new Date().toISOString();

        // Atomic upsert on (organization_id, phone_number) — prevents duplicate
        // conversations when concurrent webhook deliveries arrive.
        const { data: convo, error: convErr } = await supabase
          .from('whatsapp_conversations')
          .upsert(
            {
              organization_id: organizationId,
              phone_number: phoneNumber,
              status: 'active',
              priority: 'normal',
              last_message_at: nowIso,
            },
            { onConflict: 'organization_id,phone_number' },
          )
          .select('id')
          .single();

        if (convErr || !convo?.id) {
          console.error('conversation upsert error:', convErr);
          continue;
        }
        const conversationId = convo.id;

        // Upsert by (organization_id, message_id) — Meta may retry the same
        // webhook; we ignore duplicates instead of inserting again.
        const mediaTypes = ['image', 'audio', 'voice', 'video', 'document', 'sticker'];
        let mediaPath: string | null = null;
        let mediaMime: string | null = null;
        let mediaFileName: string | null = null;
        let mediaCaption: string | null = null;
        let contentText: string | null = message.text?.body ?? null;

        if (mediaTypes.includes(message.type)) {
          const media = message[message.type];
          mediaMime = normalizeMime(media?.mime_type);
          mediaFileName = media?.filename ?? null;
          mediaCaption = media?.caption ?? null;
          if (media?.id) {
            try {
              const downloaded = await downloadAndStoreMedia(
                supabase, organizationId, conversationId, message.id, media.id, mediaMime,
              );
              mediaPath = downloaded.path;
              mediaMime = downloaded.mimeType || mediaMime;
            } catch (e) {
              console.error('media download failed', { messageId: message.id, mediaId: media.id, mime: mediaMime, error: String(e) });
            }
          }
          if (mediaCaption && !contentText) contentText = mediaCaption;
        } else if (message.type === 'location' && message.location) {
          contentText = JSON.stringify({
            lat: message.location.latitude,
            lng: message.location.longitude,
            name: message.location.name,
            address: message.location.address,
          });
        } else if (message.type === 'interactive' && message.interactive) {
          const ir = message.interactive;
          contentText = ir.button_reply?.title || ir.list_reply?.title || ir.list_reply?.description || null;
        } else if (message.type === 'button' && message.button) {
          contentText = message.button.text ?? null;
        } else if (message.type === 'reaction' && message.reaction) {
          contentText = message.reaction.emoji ?? null;
        }

        const { error: msgErr } = await supabase
          .from('whatsapp_messages')
          .upsert(
            {
              organization_id: organizationId,
              conversation_id: conversationId,
              message_id: message.id,
              direction: 'inbound',
              message_type: message.type,
              content: contentText,
              media_storage_path: mediaPath,
              media_mime_type: mediaMime,
              media_file_name: mediaFileName,
              media_caption: mediaCaption,
              sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
              status: 'delivered',
            },
            { onConflict: 'organization_id,message_id', ignoreDuplicates: true },
          );
        if (msgErr) console.error('message upsert error:', msgErr);

        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: nowIso })
          .eq('id', conversationId);
      }
    }

    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        const patch: Record<string, unknown> = { status: status.status };
        if (status.status === 'delivered') patch.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        if (status.status === 'read') patch.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        await supabase
          .from('whatsapp_messages')
          .update(patch)
          .eq('message_id', status.id)
          .eq('organization_id', organizationId);
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

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

async function downloadAndStoreMedia(
  supabase: any,
  organizationId: string,
  conversationId: string,
  messageId: string,
  mediaId: string,
  hintedMime: string | null,
): Promise<{ path: string; mimeType: string | null }> {
  // Get per-org access token
  const { data: settings } = await supabase
    .from('whatsapp_settings')
    .select('access_token, api_version')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const accessToken = settings?.access_token;
  if (!accessToken) throw new Error('no access_token for org');
  const gv = settings?.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';

  // 1) get temporary URL
  const metaRes = await fetch(`https://graph.facebook.com/${gv}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) throw new Error(`meta media meta failed ${metaRes.status}`);
  const meta = await metaRes.json();
  const mimeType = normalizeMime(meta.mime_type) || hintedMime || 'application/octet-stream';

  // 2) download binary
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) throw new Error(`meta media download failed ${fileRes.status}`);
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  const rawExt = MIME_EXT[mimeType] || mimeType.split('/')[1] || 'bin';
  const ext = rawExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const path = `${organizationId}/${conversationId}/${messageId}.${ext}`;

  const { error } = await supabase.storage
    .from('whatsapp-media')
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) throw error;

  return { path, mimeType };
}
