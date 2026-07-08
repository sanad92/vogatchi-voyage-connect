
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
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifySignature(body: Uint8Array, signature: string, appSecret: string): Promise<boolean> {
  if (!signature || !appSecret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bodyBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const mac = hexEncode(await crypto.subtle.sign('HMAC', key, bodyBuffer));
  const expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return timingSafeEqual(mac, expected);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      // Webhook verification (Meta hub challenge)
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Prefer env secret (single-tenant / initial setup); fall back to DB for multi-tenant later.
      let expected = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
      if (!expected) {
        const { data } = await supabase
          .from('whatsapp_settings')
          .select('webhook_verify_token')
          .eq('is_active', true)
          .not('webhook_verify_token', 'is', null)
          .limit(1)
          .maybeSingle();
        expected = data?.webhook_verify_token ?? '';
      }

      if (!expected) {
        console.error('[whatsapp-webhook] verification failed: no verify token configured (env WHATSAPP_VERIFY_TOKEN missing and no active whatsapp_settings row)');
        return new Response('Server misconfigured: no verify token', { status: 500, headers: corsHeaders });
      }

      if (mode !== 'subscribe') {
        console.error('[whatsapp-webhook] verification failed: hub.mode is', mode);
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      if (!token || token !== expected) {
        console.error('[whatsapp-webhook] verification failed: token mismatch');
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      console.log('[whatsapp-webhook] verification succeeded');
      return new Response(challenge ?? '', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (req.method === 'POST') {
      // Verify HMAC signature from Meta
      const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
      const signature = req.headers.get('X-Hub-Signature-256') ?? '';
      const rawBody = new Uint8Array(await req.arrayBuffer());

      if (appSecret) {
        const valid = await verifySignature(rawBody, signature, appSecret);
        if (!valid) {
          console.error('Invalid webhook signature');
          return new Response('Forbidden', { status: 403, headers: corsHeaders });
        }
      } else {
        console.warn('WHATSAPP_APP_SECRET not set - skipping signature verification');
      }

      const body = JSON.parse(new TextDecoder().decode(rawBody));
      console.log('WhatsApp Webhook received:', JSON.stringify(body, null, 2));

      // Process webhook data
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await processMessage(change.value, supabase);
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

async function processMessage(messageData: any, supabase: any) {
  try {
    // Process incoming messages
    if (messageData.messages) {
      for (const message of messageData.messages) {
        const phoneNumber = message.from;
        
        // Auto-assign conversation
        const { data: conversationId } = await supabase.rpc('auto_assign_conversation', {
          p_phone_number: phoneNumber,
          p_message_content: message.text?.body || message.type
        });

        // Save the message
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          message_id: message.id,
          direction: 'inbound',
          message_type: message.type,
          content: message.text?.body || null,
          media_url: message.image?.link || message.document?.link || message.audio?.link || message.video?.link,
          media_mime_type: message.image?.mime_type || message.document?.mime_type || message.audio?.mime_type || message.video?.mime_type,
          sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString()
        });

        // Update conversation last message time
        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    }

    // Process message status updates
    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        await supabase.rpc('update_message_status', {
          p_message_id: status.id,
          p_status: status.status,
          p_timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}
