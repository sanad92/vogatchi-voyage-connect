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

async function computeAppSecretProof(accessToken: string, appSecret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return hexEncode(await crypto.subtle.sign('HMAC', key, enc.encode(accessToken)));
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

          for (const change of entry.changes ?? []) {
            if (change.field !== 'messages') continue;

            // Route by phone_number_id (per-inbox). Falls back to waba_id
            // only when the payload does not include metadata.
            const phoneNumberId: string | undefined = change.value?.metadata?.phone_number_id;
            let settings: { id: string; organization_id: string } | null = null;

            if (phoneNumberId) {
              const { data } = await supabase
                .from('whatsapp_settings')
                .select('id, organization_id')
                .eq('phone_number_id', phoneNumberId)
                .maybeSingle();
              settings = data ?? null;
            }
            if (!settings) {
              const { data } = await supabase
                .from('whatsapp_settings')
                .select('id, organization_id')
                .eq('waba_id', wabaId)
                .eq('is_default', true)
                .maybeSingle();
              settings = data ?? null;
            }

            if (!settings?.organization_id) {
              console.warn('No inbox mapped for phone_number_id/waba_id', { phoneNumberId, wabaId });
              continue;
            }

            await processMessage(change.value, supabase, settings.organization_id, settings.id);
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
        let mediaProviderId: string | null = null;
        let mediaDownloadStatus: string | null = null;
        let mediaDownloadError: string | null = null;
        let contentText: string | null = message.text?.body ?? null;

        if (mediaTypes.includes(message.type)) {
          const media = message[message.type];
          mediaMime = normalizeMime(media?.mime_type);
          mediaFileName = media?.filename ?? null;
          mediaCaption = media?.caption ?? null;
          mediaProviderId = media?.id ?? null;
          if (media?.id) {
            try {
              const downloaded = await downloadAndStoreMedia(
                supabase, organizationId, conversationId, message.id, media.id, mediaMime,
              );
              mediaPath = downloaded.path;
              mediaMime = downloaded.mimeType || mediaMime;
              mediaDownloadStatus = 'success';
            } catch (e) {
              mediaDownloadStatus = 'failed';
              mediaDownloadError = String(e?.message ?? e).slice(0, 500);
              console.error('[wa-webhook] media download failed', {
                messageId: message.id, mediaId: media.id, mime: mediaMime, error: mediaDownloadError,
              });
            }
          } else {
            mediaDownloadStatus = 'failed';
            mediaDownloadError = 'no media id in webhook payload';
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

        const { data: insertedMsg, error: msgErr } = await supabase
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
              media_provider_id: mediaProviderId,
              media_mime_type: mediaMime,
              media_file_name: mediaFileName,
              media_caption: mediaCaption,
              media_download_status: mediaDownloadStatus,
              media_download_error: mediaDownloadError,
              media_download_attempts: mediaDownloadStatus ? 1 : 0,
              media_last_attempt_at: mediaDownloadStatus ? new Date().toISOString() : null,
              sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
              status: 'delivered',
            },
            { onConflict: 'organization_id,message_id', ignoreDuplicates: false },
          )
          .select('id')
          .maybeSingle();
        if (msgErr) console.error('[wa-webhook] message upsert error:', msgErr);

        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: nowIso })
          .eq('id', conversationId);

        // Fire-and-forget automation engine triggers
        try {
          supabase.functions.invoke('whatsapp-automation-engine', {
            body: {
              trigger_type: 'message_received',
              organization_id: organizationId,
              conversation_id: conversationId,
              message_id: insertedMsg?.id,
              extra: { keyword: contentText },
            },
          }).catch((e: any) => console.error('[wa-webhook] automation trigger failed', e));
          if (contentText) {
            supabase.functions.invoke('whatsapp-automation-engine', {
              body: {
                trigger_type: 'keyword_match',
                organization_id: organizationId,
                conversation_id: conversationId,
                message_id: insertedMsg?.id,
                extra: { keyword: contentText },
              },
            }).catch(() => {});
            // Chatbot auto-reply
            supabase.functions.invoke('whatsapp-chatbot-reply', {
              body: {
                organization_id: organizationId,
                conversation_id: conversationId,
                message_id: insertedMsg?.id,
                user_message: contentText,
              },
            }).catch((e: any) => console.error('[wa-webhook] chatbot invoke failed', e));
          }
        } catch (e) {
          console.error('[wa-webhook] automation invoke error', e);
        }
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
  const { data: settings } = await supabase
    .from('whatsapp_settings')
    .select('access_token, api_version')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const accessToken = settings?.access_token;
  if (!accessToken) throw new Error('no access_token for org');
  const gv = settings?.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';

  const appSecret = Deno.env.get('META_APP_SECRET') ?? Deno.env.get('WHATSAPP_APP_SECRET');
  const proof = appSecret ? await computeAppSecretProof(accessToken, appSecret) : null;
  const withProof = (url: string) => {
    if (!proof) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}appsecret_proof=${proof}`;
  };

  // Retry helper: 3 attempts with exponential backoff (300ms, 900ms, 2700ms).
  const fetchWithRetry = async (url: string, init: RequestInit, label: string): Promise<Response> => {
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, init);
        if (res.ok) return res;
        // Retry on 5xx and 429; fail fast on 4xx.
        if (res.status >= 500 || res.status === 429) {
          lastErr = new Error(`${label} ${res.status}`);
        } else {
          const body = await res.text().catch(() => '');
          throw new Error(`${label} ${res.status}: ${body.slice(0, 200)}`);
        }
      } catch (e) {
        lastErr = e;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * Math.pow(3, attempt - 1)));
    }
    throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
  };

  // 1) Get temporary URL for the media
  const metaRes = await fetchWithRetry(
    withProof(`https://graph.facebook.com/${gv}/${mediaId}`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
    'meta media meta',
  );
  const meta = await metaRes.json();
  const mimeType = normalizeMime(meta.mime_type) || hintedMime || 'application/octet-stream';

  // 2) Download the binary (lookaside CDN; appsecret_proof also required when enforced)
  const fileRes = await fetchWithRetry(
    withProof(meta.url),
    { headers: { Authorization: `Bearer ${accessToken}` } },
    'meta media download',
  );
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error('downloaded empty file');

  const rawExt = MIME_EXT[mimeType] || mimeType.split('/')[1] || 'bin';
  const ext = rawExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const path = `${organizationId}/${conversationId}/${messageId}.${ext}`;

  const { error } = await supabase.storage
    .from('whatsapp-media')
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`storage upload: ${error.message ?? String(error)}`);

  console.log('[wa-webhook] media stored', { path, mimeType, size: bytes.byteLength });
  return { path, mimeType };
}


