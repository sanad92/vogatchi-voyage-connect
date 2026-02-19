
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, messageType, content, mediaUrl, templateName, templateLanguage, templateParameters, sentBy } = await req.json();

    // Get WhatsApp settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!settings) {
      throw new Error('WhatsApp settings not found');
    }

    // Get conversation details
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('phone_number')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Prepare message payload
    let messagePayload: any = {
      messaging_product: "whatsapp",
      to: conversation.phone_number,
      type: messageType
    };

    switch (messageType) {
      case 'text':
        messagePayload.text = { body: content };
        break;
      case 'image':
        messagePayload.image = { link: mediaUrl };
        break;
      case 'document':
        messagePayload.document = { link: mediaUrl };
        break;
      case 'template':
        messagePayload.template = {
          name: templateName,
          language: { code: templateLanguage },
          components: templateParameters ? [{
            type: "body",
            parameters: templateParameters.map((param: string) => ({ type: "text", text: param }))
          }] : []
        };
        break;
    }

    // Send message to WhatsApp API
    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`, {
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
        conversation_id: conversationId,
        message_id: result.messages[0].id,
        direction: 'outbound',
        message_type: messageType,
        content: messageType === 'text' ? content : null,
        media_url: mediaUrl,
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

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
