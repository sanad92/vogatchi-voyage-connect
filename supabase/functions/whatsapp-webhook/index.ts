
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      // Webhook verification
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('webhook_verify_token')
        .eq('is_active', true)
        .single();

      if (mode === 'subscribe' && token === settings?.webhook_verify_token) {
        return new Response(challenge, { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      }

      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
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
