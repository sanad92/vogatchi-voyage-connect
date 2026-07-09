
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_MESSAGE_TYPES = ['text', 'image', 'audio', 'video', 'document', 'template'] as const;
const MAX_CONTENT_LENGTH = 4096;
const MAX_TEMPLATE_PARAMS = 20;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_TYPES = new Set(['image', 'audio', 'video', 'document']);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Rate limit: 30 WhatsApp messages per minute per user
    const rl = rateLimit(`whatsapp:${userId}`, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { conversationId, messageType, content, mediaUrl, mediaStoragePath, mediaMimeType, mediaFileName, mediaCaption, templateName, templateLanguage, templateParameters, sentBy } = body;

    // === Input Validation ===
    if (!conversationId || typeof conversationId !== 'string' || !UUID_REGEX.test(conversationId)) {
      return new Response(JSON.stringify({ error: 'Invalid conversationId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!messageType || !VALID_MESSAGE_TYPES.includes(messageType)) {
      return new Response(JSON.stringify({ error: `Invalid messageType. Must be one of: ${VALID_MESSAGE_TYPES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (messageType === 'text') {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Content is required for text messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        return new Response(JSON.stringify({ error: `Content must be less than ${MAX_CONTENT_LENGTH} characters` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (MEDIA_TYPES.has(messageType) && !mediaUrl && !mediaStoragePath) {
      return new Response(JSON.stringify({ error: 'mediaUrl or mediaStoragePath is required for media messages' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (messageType === 'template') {
      if (!templateName || typeof templateName !== 'string' || templateName.length > 100) {
        return new Response(JSON.stringify({ error: 'Valid templateName is required for template messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (templateParameters && (!Array.isArray(templateParameters) || templateParameters.length > MAX_TEMPLATE_PARAMS)) {
        return new Response(JSON.stringify({ error: `templateParameters must be an array with max ${MAX_TEMPLATE_PARAMS} items` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (templateParameters && !templateParameters.every((p: unknown) => typeof p === 'string' && p.length <= 1024)) {
        return new Response(JSON.stringify({ error: 'Each template parameter must be a string under 1024 characters' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get conversation (with its organization_id) to scope credentials
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('phone_number, organization_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get WhatsApp settings for this organization
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('phone_number_id, access_token, api_version, onboarding_status')
      .eq('organization_id', conversation.organization_id)
      .maybeSingle();

    if (!settings || !settings.access_token || !settings.phone_number_id) {
      throw new Error('WhatsApp not connected for this organization');
    }

    // If media is provided as a Storage path, upload it to Meta and get a media id
    let uploadedMediaId: string | null = null;
    if (MEDIA_TYPES.has(messageType) && mediaStoragePath) {
      const { data: file, error: dlErr } = await supabase.storage
        .from('whatsapp-media')
        .download(mediaStoragePath);
      if (dlErr || !file) throw new Error('Could not read uploaded media from storage');
      const mime = mediaMimeType || file.type || 'application/octet-stream';
      const fname = mediaFileName || mediaStoragePath.split('/').pop() || 'file';

      const gvUp = settings.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mime);
      form.append('file', new File([await file.arrayBuffer()], fname, { type: mime }));

      const upRes = await fetch(`https://graph.facebook.com/${gvUp}/${settings.phone_number_id}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.access_token}` },
        body: form,
      });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.id) throw new Error(`Meta media upload failed: ${JSON.stringify(upJson)}`);
      uploadedMediaId = upJson.id;
    }

    // Prepare message payload
    let messagePayload: any = {
      messaging_product: "whatsapp",
      to: conversation.phone_number,
      type: messageType
    };

    const mediaRef: any = uploadedMediaId ? { id: uploadedMediaId } : { link: mediaUrl };
    switch (messageType) {
      case 'text':
        messagePayload.text = { body: content };
        break;
      case 'image':
        messagePayload.image = { ...mediaRef, caption: mediaCaption || undefined };
        break;
      case 'video':
        messagePayload.video = { ...mediaRef, caption: mediaCaption || undefined };
        break;
      case 'audio':
        messagePayload.audio = mediaRef;
        break;
      case 'document':
        messagePayload.document = { ...mediaRef, filename: mediaFileName || undefined, caption: mediaCaption || undefined };
        break;
      case 'template':
        messagePayload.template = {
          name: templateName,
          language: { code: templateLanguage || 'ar' },
          components: templateParameters ? [{
            type: "body",
            parameters: templateParameters.map((param: string) => ({ type: "text", text: param }))
          }] : []
        };
        break;
    }

    // Send message to WhatsApp API (per-org token + api version)
    const gv = settings.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';
    // Compute appsecret_proof if META_APP_SECRET is configured (required when the Meta app enforces it)
    const appSecret = Deno.env.get('META_APP_SECRET');
    let proofQS = '';
    if (appSecret) {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(appSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(settings.access_token));
      const proof = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      proofQS = `?appsecret_proof=${proof}`;
    }
    const whatsappResponse = await fetch(`https://graph.facebook.com/${gv}/${settings.phone_number_id}/messages${proofQS}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });


    const result = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
    }

    // Save message to database
    const { data: savedMessage, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        organization_id: conversation.organization_id,
        conversation_id: conversationId,
        message_id: result.messages[0].id,
        direction: 'outbound',
        message_type: messageType,
        content: messageType === 'text' ? content : (mediaCaption || null),
        media_url: mediaUrl || null,
        media_storage_path: mediaStoragePath || null,
        media_provider_id: uploadedMediaId || null,
        media_mime_type: mediaMimeType || null,
        media_file_name: mediaFileName || null,
        media_caption: mediaCaption || null,
        template_name: templateName,
        template_language: templateLanguage,
        template_parameters: templateParameters,
        sent_by: sentBy,
        status: 'sent'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
    }

    // Update conversation last message time
    await supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return new Response(JSON.stringify({ success: true, message: savedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Send message error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
