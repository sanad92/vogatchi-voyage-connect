import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { requireUser, authErrorResponse } from '../_shared/auth.ts';
import { smtpSession, decryptSecret, friendlyMailError } from '../_shared/mail.ts';

const Body = z.object({
  threadId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  to: z.array(z.string().email()).min(1).max(20),
  cc: z.array(z.string().email()).max(20).optional(),
  subject: z.string().min(1).max(300),
  text: z.string().min(1).max(50000),
  attachments: z.array(z.object({ name: z.string().min(1).max(200), type: z.string().max(120), base64: z.string().max(14_000_000) })).max(10).optional(),
});
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // deno-lint-ignore no-explicit-any
    let thread: any = null;
    let accountId = b.accountId;
    if (b.threadId) {
      const { data } = await admin.from('email_threads').select('*').eq('id', b.threadId).maybeSingle();
      if (!data) return json({ error: 'المحادثة غير موجودة' }, 404);
      if (data.assigned_to !== user.id) return json({ error: 'لازم تستلم المحادثة الأول قبل الرد' }, 403);
      thread = data; accountId = data.account_id;
    }
    if (!accountId) return json({ error: 'اختر البريد المرسل' }, 400);
    const { data: acc } = await admin.from('email_accounts').select('*').eq('id', accountId).eq('is_active', true).maybeSingle();
    if (!acc) return json({ error: 'حساب البريد غير متاح' }, 404);
    const { data: mem } = await admin.from('organization_members').select('id').eq('organization_id', acc.organization_id).eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (!mem) return json({ error: 'Forbidden' }, 403);

    let inReplyTo: string | null = null; let references: string | null = null;
    if (thread) {
      const { data: last } = await admin.from('email_messages').select('message_id, references_header').eq('thread_id', thread.id).order('sent_at', { ascending: false }).limit(1);
      if (last?.[0]) { inReplyTo = last[0].message_id; references = [last[0].references_header, last[0].message_id].filter(Boolean).join(' ').slice(-4000); }
    }
    const domain = acc.email_address.split('@')[1] || 'mail.local';
    const messageId = `<${crypto.randomUUID()}@${domain}>`;
    try {
      await smtpSession(acc.smtp_host, acc.smtp_port, acc.username, await decryptSecret(acc.password_ciphertext), {
        fromEmail: acc.email_address, fromName: acc.display_name, to: b.to, cc: b.cc, subject: b.subject, text: b.text,
        messageId, inReplyTo, references, attachments: b.attachments,
      });
    } catch (e) { return json({ error: friendlyMailError(e) }, 422); }

    const now = new Date().toISOString();
    if (!thread) {
      const contact = b.to[0].toLowerCase();
      const { data: cust } = await admin.from('customers').select('id').eq('organization_id', acc.organization_id).ilike('email', contact).limit(1);
      const { data: t, error } = await admin.from('email_threads').insert({
        organization_id: acc.organization_id, account_id: acc.id, subject: b.subject, contact_email: contact,
        customer_id: cust?.[0]?.id ?? null, assigned_to: user.id, assigned_at: now, last_message_at: now, last_read_at: now,
        snippet: b.text.slice(0, 200),
      }).select('*').single();
      if (error) return json({ error: error.message }, 500);
      thread = t;
    } else {
      await admin.from('email_threads').update({ last_message_at: now, last_read_at: now, snippet: b.text.slice(0, 200) }).eq('id', thread.id);
    }
    const { data: msg } = await admin.from('email_messages').insert({
      organization_id: acc.organization_id, account_id: acc.id, thread_id: thread.id, message_id: messageId,
      in_reply_to: inReplyTo, references_header: references, direction: 'outbound', from_email: acc.email_address,
      from_name: acc.display_name, to_emails: b.to, cc_emails: b.cc ?? [], subject: b.subject, body_text: b.text,
      sent_by: user.id, sent_at: now,
    }).select('id').single();
    for (const a of b.attachments ?? []) {
      if (!msg) break;
      const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
      const path = `${acc.organization_id}/${msg.id}/${crypto.randomUUID()}-${a.name.replace(/[^\p{L}\p{N}._-]+/gu, '_')}`;
      const up = await admin.storage.from('email-attachments').upload(path, bytes, { contentType: a.type || 'application/octet-stream' });
      if (!up.error) await admin.from('email_attachments').insert({ organization_id: acc.organization_id, message_id: msg.id, file_name: a.name, mime_type: a.type, size_bytes: bytes.length, storage_path: path });
    }
    return json({ ok: true, threadId: thread.id });
  } catch (e) {
    const r = authErrorResponse(e, corsHeaders); if (r) return r;
    console.error('email-send', e);
    return json({ error: friendlyMailError(e) }, 500);
  }
});
