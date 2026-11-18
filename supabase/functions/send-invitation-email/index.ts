import * as React from 'npm:react@18.3.1'
import { renderToStaticMarkup } from 'npm:react-dom@18.3.1/server'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.8.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { OrganizationInviteEmail } from '../_shared/email-templates/organization-invite.tsx'

const SENDER_DOMAIN = 'notify.safarerp.com'
const FROM = 'SafarERP <noreply@safarerp.com>'
const APP_URL = 'https://safarerp.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROLE_LABELS: Record<string, string> = { admin: 'مدير', manager: 'مشرف', agent: 'موظف', viewer: 'مشاهد' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function htmlToText(html: string): string {
  return html
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  let invitationId: unknown
  try { invitationId = (await req.json())?.invitation_id } catch { /* handled below */ }
  if (typeof invitationId !== 'string' || !UUID_RE.test(invitationId)) {
    return json({ error: 'invitation_id غير صالح' }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.slice(7))
  const userId = claims?.claims?.sub
  if (claimsError || !userId) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: invite, error: inviteError } = await admin
    .from('invitations')
    .select('id, organization_id, email, role, token, status, expires_at, invited_by')
    .eq('id', invitationId)
    .maybeSingle()
  if (inviteError || !invite) return json({ error: 'الدعوة غير موجودة' }, 404)

  const [{ data: role }, { data: isPlatformAdmin }] = await Promise.all([
    admin.rpc('get_user_org_role', { _user_id: userId, _org_id: invite.organization_id }),
    admin.rpc('is_platform_admin', { _user_id: userId }),
  ])
  if (!isPlatformAdmin && !['owner', 'admin'].includes(String(role ?? ''))) {
    return json({ error: 'ليس لديك صلاحية لإرسال الدعوات' }, 403)
  }
  if (invite.status !== 'pending' || new Date(invite.expires_at) <= new Date()) {
    return json({ error: 'الدعوة لم تعد صالحة' }, 409)
  }

  const [{ data: org }, { data: inviter }] = await Promise.all([
    admin.from('organizations').select('name').eq('id', invite.organization_id).maybeSingle(),
    admin.from('profiles').select('full_name, email').eq('id', invite.invited_by).maybeSingle(),
  ])
  const organizationName = org?.name ?? 'SafarERP'
  const inviterName = inviter?.full_name?.trim() || inviter?.email || 'مدير المؤسسة'
  const acceptUrl = `${APP_URL}/accept-invite?token=${invite.token}`

  const html = '<!DOCTYPE html>' + renderToStaticMarkup(React.createElement(OrganizationInviteEmail, {
    inviterName, organizationName, roleLabel: ROLE_LABELS[invite.role] ?? 'موظف', acceptUrl,
  }))
  const text = htmlToText(html)
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) return json({ error: 'تعذر إرسال بريد الدعوة' }, 500)

  // Rendered with renderToStaticMarkup (not the stream renderer) to keep Arabic text intact.
  const logRow = (status: string, error_message?: string) =>
    admin.from('email_send_log').insert({
      message_id: null, template_name: 'organization_invitation', recipient_email: invite.email, status,
      ...(error_message ? { error_message } : {}),
    }).then(({ error }) => {
      if (error) console.error('invitation log failed', { code: error.code, message: error.message })
    })

  try {
    await sendLovableEmail(
      {
        to: invite.email,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject: `دعوة للانضمام إلى ${organizationName}`,
        html,
        text,
        purpose: 'transactional',
        label: 'organization_invitation',
        idempotency_key: `organization-invitation:${invite.id}:${invite.token}`,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logRow('suppressed')
      return json({ success: false, reason: 'recipient_suppressed' }, 200)
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error('invitation send failed', { message: message.slice(0, 300) })
    await logRow('failed', message.slice(0, 1000))
    return json({ error: 'تعذر إرسال بريد الدعوة' }, 502)
  }

  await logRow('sent')
  return json({ success: true })
})
