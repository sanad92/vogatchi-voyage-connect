import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import {
  WA_CORS as corsHeaders,
  WaError,
  buildTemplateComponents,
  graphSend,
  isWindowOpen,
  normalizePhone,
  resolveSettings,
} from '../_shared/whatsapp.ts';

const VALID_MESSAGE_TYPES = ['text', 'image', 'audio', 'video', 'document', 'template'] as const;
const MEDIA_TYPES = new Set(['image', 'audio', 'video', 'document']);
const MAX_CONTENT_LENGTH = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let messageRowId: string | null = null;

  try {
    // ---------- auth ----------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const rl = rateLimit(`whatsapp:${user.id}`, 60, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const body = await req.json();
    const {
      conversationId: rawConversationId,
      customerId,
      phoneNumber,
      messageType,
      content,
      mediaUrl,
      mediaStoragePath,
      mediaMimeType,
      mediaFileName,
      mediaCaption,
      templateId,
      templateName,
      templateLanguage,
      templateVariables,
      templateParameters,
      idempotencyKey,
      followupId,
    } = body ?? {};

    if (!messageType || !VALID_MESSAGE_TYPES.includes(messageType)) {
      return json({ error: `Invalid messageType. One of: ${VALID_MESSAGE_TYPES.join(', ')}` }, 400);
    }

    // ---------- resolve conversation (or create it from a customer/phone) ----------
    let conversationId: string | null =
      rawConversationId && UUID_RE.test(rawConversationId) ? rawConversationId : null;
    let conversation: any = null;

    if (conversationId) {
      const { data } = await admin
        .from('whatsapp_conversations')
        .select('id, phone_number, organization_id, whatsapp_settings_id, customer_id')
        .eq('id', conversationId)
        .maybeSingle();
      conversation = data;
      if (!conversation) return json({ error: 'Conversation not found' }, 404);
    } else {
      // Resolve target phone + org from the customer record
      let orgId: string | null = null;
      let toPhone = normalizePhone(phoneNumber);
      if (customerId && UUID_RE.test(customerId)) {
        const { data: cust } = await admin
          .from('customers')
          .select('id, phone, organization_id, whatsapp_opt_out')
          .eq('id', customerId).maybeSingle();
        if (!cust) return json({ error: 'Customer not found' }, 404);
        if (cust.whatsapp_opt_out) {
          return json({ error: 'العميل ألغى الاشتراك في رسائل واتساب | Customer opted out of WhatsApp' }, 400);
        }
        orgId = cust.organization_id;
        toPhone = toPhone || normalizePhone(cust.phone);
      }
      if (!toPhone) return json({ error: 'رقم واتساب غير صالح | Invalid WhatsApp number' }, 400);
      if (!orgId) return json({ error: 'customerId or conversationId is required' }, 400);

      const { data: existing } = await admin
        .from('whatsapp_conversations')
        .select('id, phone_number, organization_id, whatsapp_settings_id, customer_id')
        .eq('organization_id', orgId)
        .eq('phone_number', toPhone)
        .maybeSingle();

      if (existing) {
        conversation = existing;
        if (!existing.customer_id && customerId) {
          await admin.from('whatsapp_conversations').update({ customer_id: customerId }).eq('id', existing.id);
        }
      } else {
        const settingsForNew = await resolveSettings(admin, orgId);
        const { data: created, error: cErr } = await admin
          .from('whatsapp_conversations')
          .insert({
            organization_id: orgId,
            phone_number: toPhone,
            customer_id: customerId ?? null,
            whatsapp_settings_id: settingsForNew.id,
            status: 'active',
            priority: 'normal',
            last_message_at: new Date().toISOString(),
          })
          .select('id, phone_number, organization_id, whatsapp_settings_id, customer_id')
          .single();
        if (cErr) throw new WaError('CONVERSATION_CREATE_FAILED', cErr.message);
        conversation = created;
      }
      conversationId = conversation.id;
    }

    // ---------- org membership check (multi-tenant guard) ----------
    const { data: membership } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', conversation.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return json({ error: 'Forbidden' }, 403);

    // ---------- idempotency ----------
    if (idempotencyKey) {
      const { data: dupe } = await admin
        .from('whatsapp_messages')
        .select('id, status, message_id, error_message')
        .eq('organization_id', conversation.organization_id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (dupe && dupe.status !== 'failed') {
        return json({ success: true, duplicate: true, message: dupe });
      }
    }

    const to = normalizePhone(conversation.phone_number);
    if (!to) return json({ error: 'رقم المحادثة غير صالح | Conversation phone number is invalid' }, 400);

    const settings = await resolveSettings(admin, conversation.organization_id, conversation.whatsapp_settings_id);

    // ---------- 24h service window enforcement ----------
    const windowOpen = await isWindowOpen(admin, conversationId!);
    if (messageType !== 'template' && !windowOpen) {
      return json({
        error: 'انتهت نافذة الـ24 ساعة — اختر قالبًا معتمدًا للإرسال | The 24-hour window is closed — send an approved template instead',
        code: 'WINDOW_CLOSED',
        windowOpen: false,
      }, 409);
    }

    // ---------- build payload ----------
    let payload: Record<string, any> = { messaging_product: 'whatsapp', to, type: messageType };
    let tplRow: any = null;
    let usedVars: any = null;

    if (messageType === 'text') {
      if (!content || typeof content !== 'string' || !content.trim()) {
        return json({ error: 'Content is required for text messages' }, 400);
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        return json({ error: `Content must be under ${MAX_CONTENT_LENGTH} characters` }, 400);
      }
      payload.text = { body: content, preview_url: false };
    } else if (MEDIA_TYPES.has(messageType)) {
      if (!mediaUrl && !mediaStoragePath) {
        return json({ error: 'mediaUrl or mediaStoragePath is required' }, 400);
      }
      let mediaRef: any = { link: mediaUrl };
      if (mediaStoragePath) {
        const uploadedId = await uploadMediaToMeta(admin, settings, mediaStoragePath, mediaMimeType, mediaFileName);
        mediaRef = { id: uploadedId };
      }
      if (messageType === 'image') payload.image = { ...mediaRef, caption: mediaCaption || undefined };
      if (messageType === 'video') payload.video = { ...mediaRef, caption: mediaCaption || undefined };
      if (messageType === 'audio') payload.audio = mediaRef;
      if (messageType === 'document') {
        payload.document = { ...mediaRef, filename: mediaFileName || undefined, caption: mediaCaption || undefined };
      }
    } else if (messageType === 'template') {
      // Resolve the template row (by id preferred, else name+org)
      let q = admin.from('whatsapp_templates')
        .select('id, name, language, status, meta_status, components, body_text, header_text, header_format, body_variable_count, header_variable_count, category')
        .eq('organization_id', conversation.organization_id);
      q = templateId && UUID_RE.test(templateId) ? q.eq('id', templateId) : q.eq('name', templateName);
      const { data: tpls } = await q.limit(5);
      tplRow = (tpls ?? [])[0] ?? null;

      if (!tplRow) {
        throw new WaError('TEMPLATE_NOT_FOUND', 'القالب غير موجود — قم بمزامنة القوالب | Template not found — sync templates first');
      }
      const st = String(tplRow.meta_status || tplRow.status || '').toLowerCase();
      if (st !== 'approved') {
        throw new WaError('TEMPLATE_NOT_APPROVED', `القالب "${tplRow.name}" غير معتمد (${st || 'unknown'}) | Template is not approved`);
      }

      usedVars = normalizeVars(templateVariables, templateParameters);
      const components = buildTemplateComponents(tplRow, usedVars);
      payload.template = {
        name: tplRow.name,
        language: { code: templateLanguage || tplRow.language || 'ar' },
        ...(components.length ? { components } : {}),
      };
    }

    // ---------- persist "sending" row first so failures are always visible ----------
    const baseRow: Record<string, unknown> = {
      organization_id: conversation.organization_id,
      whatsapp_settings_id: settings.id,
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: messageType,
      content: messageType === 'text' ? content : (mediaCaption || tplRow?.body_text || null),
      media_url: mediaUrl || null,
      media_storage_path: mediaStoragePath || null,
      media_mime_type: mediaMimeType || null,
      media_file_name: mediaFileName || null,
      media_caption: mediaCaption || null,
      template_name: tplRow?.name ?? templateName ?? null,
      template_language: tplRow?.language ?? templateLanguage ?? null,
      template_parameters: usedVars ?? null,
      idempotency_key: idempotencyKey || null,
      followup_id: followupId || null,
      sent_by: user.id,
      status: 'sending',
      sent_at: new Date().toISOString(),
    };

    const { data: pending } = await admin.from('whatsapp_messages').insert(baseRow).select('id').single();
    messageRowId = pending?.id ?? null;

    // ---------- send ----------
    const result = await graphSend(settings, payload);

    if (!result.ok) {
      if (messageRowId) {
        await admin.from('whatsapp_messages').update({
          status: 'failed',
          error_code: result.errorCode,
          error_message: result.errorMessage,
          error_details: result.errorDetails as any,
          idempotency_key: null, // allow a clean retry
        }).eq('id', messageRowId);
      }
      return json({
        error: result.errorMessage || 'فشل الإرسال | Send failed',
        code: result.errorCode,
        messageId: messageRowId,
      }, 400);
    }

    const { data: saved } = await admin.from('whatsapp_messages').update({
      status: 'sent',
      message_id: result.providerMessageId,
      error_code: null,
      error_message: null,
    }).eq('id', messageRowId!).select().single();

    await admin.from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (tplRow?.id) {
      await admin.from('whatsapp_templates')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tplRow.id);
    }

    return json({ success: true, conversationId, message: saved, providerMessageId: result.providerMessageId });
  } catch (error) {
    const isWa = error instanceof WaError;
    const msg = isWa ? error.message : (error as Error)?.message || 'Failed to send message';
    console.error('[send-whatsapp-message]', msg, error);
    if (messageRowId) {
      await admin.from('whatsapp_messages').update({
        status: 'failed',
        error_code: isWa ? (error as WaError).code : 'INTERNAL',
        error_message: msg,
        idempotency_key: null,
      }).eq('id', messageRowId);
    }
    return json({ error: msg, code: isWa ? (error as WaError).code : 'INTERNAL' }, isWa ? 400 : 500);
  }
});

function normalizeVars(templateVariables: any, templateParameters: any) {
  if (templateVariables && typeof templateVariables === 'object' && !Array.isArray(templateVariables)) {
    return {
      body: Array.isArray(templateVariables.body) ? templateVariables.body.map(String) : [],
      header: Array.isArray(templateVariables.header) ? templateVariables.header.map(String) : [],
    };
  }
  if (Array.isArray(templateVariables)) return { body: templateVariables.map(String), header: [] };
  if (Array.isArray(templateParameters)) return { body: templateParameters.map(String), header: [] };
  return { body: [], header: [] };
}

async function uploadMediaToMeta(
  admin: any,
  settings: { phone_number_id: string; access_token: string; api_version: string | null },
  storagePath: string,
  mime?: string,
  fileName?: string,
): Promise<string> {
  const { data: file, error } = await admin.storage.from('whatsapp-media').download(storagePath);
  if (error || !file) throw new WaError('MEDIA_READ_FAILED', 'تعذر قراءة الملف المرفوع | Could not read uploaded media');

  const contentType = mime || file.type || 'application/octet-stream';
  const name = fileName || storagePath.split('/').pop() || 'file';
  const gv = settings.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', contentType);
  form.append('file', new File([await file.arrayBuffer()], name, { type: contentType }));

  const res = await fetch(`https://graph.facebook.com/${gv}/${settings.phone_number_id}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.access_token}` },
    body: form,
  });
  const j = await res.json();
  if (!res.ok || !j?.id) {
    throw new WaError('MEDIA_UPLOAD_FAILED', `فشل رفع الملف إلى واتساب | Media upload failed: ${j?.error?.message || res.status}`);
  }
  return j.id as string;
}
