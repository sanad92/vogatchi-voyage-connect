import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import PostalMime from 'npm:postal-mime@2.4.4';
import { requireUser, requireInternalCaller, authErrorResponse, AuthError } from '../_shared/auth.ts';
import { Imap, decryptSecret, friendlyMailError, normalizeSubject } from '../_shared/mail.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const MAX_PER_RUN = 60;
const imapDate = (d: Date) => `${d.getUTCDate()}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]}-${d.getUTCFullYear()}`;

// deno-lint-ignore no-explicit-any
async function syncAccount(admin: SupabaseClient, acc: any) {
  const lockCutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: locked } = await admin.from('email_accounts').update({ sync_locked_at: new Date().toISOString() })
    .eq('id', acc.id).or(`sync_locked_at.is.null,sync_locked_at.lt.${lockCutoff}`).select('id');
  if (!locked?.length) return { skipped: true };
  let imported = 0;
  try {
    const im = await Imap.connect(acc.imap_host, acc.imap_port);
    await im.login(acc.username, await decryptSecret(acc.password_ciphertext));
    const validity = await im.select('INBOX');
    let lastUid = Number(acc.last_uid || 0);
    if (acc.uid_validity && validity && Number(acc.uid_validity) !== validity) lastUid = 0;
    let uids = lastUid === 0
      ? await im.search(`SINCE ${imapDate(new Date(Date.now() - 30 * 86400_000))}`)
      : (await im.search(`UID ${lastUid + 1}:*`)).filter((u) => u > lastUid);
    uids.sort((a, b) => a - b);
    if (lastUid === 0 && uids.length > 200) uids = uids.slice(-200);
    uids = uids.slice(0, MAX_PER_RUN);
    for (let i = 0; i < uids.length; i += 10) {
      const batch = await im.fetchRaw(uids.slice(i, i + 10));
      for (const { uid, raw } of batch) {
        try { if (await storeMessage(admin, acc, uid, raw)) imported++; }
        catch (e) { console.error('store failed', uid, e); }
        if (uid > lastUid) lastUid = uid;
      }
    }
    await im.logout();
    await admin.from('email_accounts').update({ last_uid: lastUid, uid_validity: validity, last_synced_at: new Date().toISOString(), sync_error: null, sync_locked_at: null }).eq('id', acc.id);
  } catch (e) {
    await admin.from('email_accounts').update({ sync_error: friendlyMailError(e), sync_locked_at: null, last_synced_at: new Date().toISOString() }).eq('id', acc.id);
    return { error: friendlyMailError(e) };
  }
  return { imported };
}

// deno-lint-ignore no-explicit-any
async function storeMessage(admin: SupabaseClient, acc: any, uid: number, raw: Uint8Array): Promise<boolean> {
  const p = await PostalMime.parse(raw);
  const messageId = (p.messageId || `<uid-${uid}-${acc.id}@local>`).trim();
  const { data: dup } = await admin.from('email_messages').select('id').eq('account_id', acc.id).eq('message_id', messageId).maybeSingle();
  if (dup) return false;
  const fromEmail = (p.from?.address || '').toLowerCase();
  if (!fromEmail || fromEmail === acc.email_address) return false;
  const refs = [p.inReplyTo, ...(p.references || '').split(/\s+/)].filter(Boolean) as string[];
  const sentAt = p.date ? new Date(p.date).toISOString() : new Date().toISOString();
  const snippet = (p.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);

  let threadId: string | null = null;
  if (refs.length) {
    const { data } = await admin.from('email_messages').select('thread_id').eq('account_id', acc.id).in('message_id', refs.slice(-20)).limit(1);
    threadId = data?.[0]?.thread_id ?? null;
  }
  if (!threadId) {
    const subj = normalizeSubject(p.subject);
    const { data } = await admin.from('email_threads').select('id, subject').eq('account_id', acc.id).eq('contact_email', fromEmail)
      .order('last_message_at', { ascending: false }).limit(10);
    threadId = data?.find((t) => normalizeSubject(t.subject) === subj)?.id ?? null;
  }
  if (!threadId) {
    const { data: cust } = await admin.from('customers').select('id').eq('organization_id', acc.organization_id).ilike('email', fromEmail).limit(1);
    const { data: t, error } = await admin.from('email_threads').insert({
      organization_id: acc.organization_id, account_id: acc.id, subject: p.subject || '(بدون عنوان)',
      contact_email: fromEmail, contact_name: p.from?.name || null, customer_id: cust?.[0]?.id ?? null,
      last_message_at: sentAt, last_inbound_at: sentAt, snippet,
    }).select('id').single();
    if (error) throw error;
    threadId = t.id;
  } else {
    const { data: t } = await admin.from('email_threads').select('status').eq('id', threadId).single();
    const patch: Record<string, unknown> = { last_message_at: sentAt, last_inbound_at: sentAt, snippet };
    if (t?.status === 'closed') Object.assign(patch, { status: 'open', closed_at: null, assigned_to: null, assigned_at: null });
    await admin.from('email_threads').update(patch).eq('id', threadId);
  }

  const { data: msg, error: mErr } = await admin.from('email_messages').insert({
    organization_id: acc.organization_id, account_id: acc.id, thread_id: threadId, message_id: messageId,
    in_reply_to: p.inReplyTo || null, references_header: p.references || null, direction: 'inbound',
    from_email: fromEmail, from_name: p.from?.name || null,
    to_emails: (p.to || []).map((x) => x.address).filter(Boolean), cc_emails: (p.cc || []).map((x) => x.address).filter(Boolean),
    subject: p.subject || null, body_text: (p.text || '').slice(0, 200000), body_html: (p.html || '').slice(0, 500000) || null,
    imap_uid: uid, sent_at: sentAt,
  }).select('id').single();
  if (mErr) throw mErr;

  for (const a of p.attachments || []) {
    const content = typeof a.content === 'string' ? new TextEncoder().encode(a.content) : new Uint8Array(a.content as ArrayBuffer);
    if (content.length > 20 * 1024 * 1024) continue;
    const name = (a.filename || 'attachment').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 120);
    const path = `${acc.organization_id}/${msg.id}/${crypto.randomUUID()}-${name}`;
    const up = await admin.storage.from('email-attachments').upload(path, content, { contentType: a.mimeType || 'application/octet-stream' });
    if (up.error) { console.error('attachment upload', up.error); continue; }
    await admin.from('email_attachments').insert({ organization_id: acc.organization_id, message_id: msg.id, file_name: a.filename || name, mime_type: a.mimeType, size_bytes: content.length, storage_path: path });
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    let internal = false;
    try { requireInternalCaller(req); internal = true; } catch { /* user call */ }

    let query = admin.from('email_accounts').select('*').eq('is_active', true);
    if (!internal) {
      const user = await requireUser(req);
      const orgId = String(body.organizationId || '');
      const { data: m } = await admin.from('organization_members').select('id').eq('organization_id', orgId).eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (!m) throw new AuthError('Forbidden', 403);
      query = query.eq('organization_id', orgId);
      if (body.accountId) query = query.eq('id', String(body.accountId));
    }
    const { data: accounts } = await query.limit(50);
    const started = Date.now();
    const results: Record<string, unknown> = {};
    for (const acc of accounts || []) {
      if (Date.now() - started > 100_000) break;
      results[acc.id] = await syncAccount(admin, acc);
    }
    return json({ ok: true, results });
  } catch (e) {
    const r = authErrorResponse(e, corsHeaders); if (r) return r;
    console.error('email-sync', e);
    return json({ error: String(e) }, 500);
  }
});
