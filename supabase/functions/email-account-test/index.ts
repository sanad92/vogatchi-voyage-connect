import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { requireUser, authErrorResponse } from '../_shared/auth.ts';
import { Imap, smtpSession, encryptSecret, friendlyMailError } from '../_shared/mail.ts';

const Body = z.object({
  organizationId: z.string().uuid(),
  provider: z.enum(['gmail', 'outlook', 'custom']),
  email: z.string().email().max(255),
  displayName: z.string().max(120).optional().nullable(),
  imapHost: z.string().min(3).max(255).regex(/^[a-z0-9.-]+$/i),
  imapPort: z.number().int().min(1).max(65535),
  smtpHost: z.string().min(3).max(255).regex(/^[a-z0-9.-]+$/i),
  smtpPort: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(500),
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
    const { data: m } = await admin.from('organization_members').select('role')
      .eq('organization_id', b.organizationId).eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (!m || !['owner', 'admin'].includes(m.role)) return json({ error: 'الربط متاح للمالك والأدمن فقط' }, 403);

    // Test IMAP
    try {
      const im = await Imap.connect(b.imapHost, b.imapPort);
      await im.login(b.username, b.password);
      await im.select('INBOX');
      await im.logout();
    } catch (e) { return json({ error: `استقبال البريد: ${friendlyMailError(e)}`, stage: 'imap' }, 422); }
    // Test SMTP
    try { await smtpSession(b.smtpHost, b.smtpPort, b.username, b.password); }
    catch (e) { return json({ error: `إرسال البريد: ${friendlyMailError(e)}`, stage: 'smtp' }, 422); }

    const row = {
      organization_id: b.organizationId, provider: b.provider, email_address: b.email.toLowerCase(),
      display_name: b.displayName || null, imap_host: b.imapHost, imap_port: b.imapPort,
      smtp_host: b.smtpHost, smtp_port: b.smtpPort, username: b.username,
      password_ciphertext: await encryptSecret(b.password), is_active: true, sync_error: null, created_by: user.id,
    };
    const { data, error } = await admin.from('email_accounts')
      .upsert(row, { onConflict: 'organization_id,email_address' }).select('id').single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: data.id });
  } catch (e) {
    const r = authErrorResponse(e, corsHeaders); if (r) return r;
    console.error('email-account-test', e);
    return json({ error: friendlyMailError(e) }, 500);
  }
});
