import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { importPKCS8, SignJWT } from 'npm:jose@6.2.18';

const googleTokenUrl = 'https://oauth2.googleapis.com/token';
const messagingScope = 'https://www.googleapis.com/auth/firebase.messaging';

type Job = { job_id: number; notification_id: string; token: string; attempts: number };
type Sender = { project_id: string; client_email: string; private_key: string };

async function authorized(actual: string | null, expected: string | undefined) {
  if (!actual || !expected || expected.length < 32) return false;
  const encode = new TextEncoder();
  const [left, right] = await Promise.all([actual, 'Bearer ' + expected].map(
    value => crypto.subtle.digest('SHA-256', encode.encode(value)),
  ));
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function accessToken(sender: Sender): Promise<string> {
  const key = await importPKCS8(sender.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: messagingScope }).setProtectedHeader({ alg: 'RS256' })
    .setIssuer(sender.client_email).setAudience(googleTokenUrl).setIssuedAt().setExpirationTime('10m').sign(key);
  const reply = await fetch(googleTokenUrl, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!reply.ok) throw new Error('Firebase authorization failed');
  const token = (await reply.json()).access_token;
  if (typeof token !== 'string' || !token) throw new Error('Firebase access token missing');
  return token;
}

async function send(project: string, access: string, job: Job) {
  const reply = await fetch('https://fcm.googleapis.com/v1/projects/' + project + '/messages:send', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { authorization: 'Bearer ' + access, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: job.token,
        notification: { title: 'Safar ERP', body: 'تم إسناد مهمة إليك.' },
        data: { notificationId: job.notification_id },
        android: {
          ttl: '3600s', priority: 'HIGH',
          notification: { channel_id: 'safar_tasks', tag: job.notification_id, visibility: 'PRIVATE' },
        },
      },
    }),
  });
  if (reply.ok) return 'sent';
  const failure = await reply.json().catch(() => null);
  if (failure?.error?.details?.some((item: { errorCode?: string }) => item.errorCode === 'UNREGISTERED')) {
    return 'unregistered';
  }
  return reply.status === 401 || reply.status === 403 || reply.status === 429 || reply.status >= 500
    ? 'retry' : 'dropped';
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  if (!await authorized(request.headers.get('authorization'), Deno.env.get('SAFAR_MOBILE_PUSH_WORKER_SECRET'))) {
    return new Response(null, { status: 401 });
  }
  const rawSender = Deno.env.get('SAFAR_FIREBASE_SERVICE_ACCOUNT');
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!rawSender || !url || !service) return Response.json({ status: 'not_configured' }, { status: 503 });

  try {
    const sender = JSON.parse(rawSender) as Sender;
    if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(sender.project_id) ||
        !sender.client_email || !sender.private_key) {
      return Response.json({ status: 'invalid_configuration' }, { status: 503 });
    }
    const access = await accessToken(sender);
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('claim_mobile_task_push', { _limit: 20 });
    if (error) return Response.json({ status: 'claim_failed' }, { status: 503 });

    const results = await Promise.all((data as Job[]).map(async job => {
      const result = await send(sender.project_id, access, job).catch(() => 'retry' as const);
      if (result === 'unregistered') {
        const { error: failure } = await db.from('mobile_push_devices').delete().eq('token', job.token);
        return failure ? 'unrecorded' : 'unregistered';
      }
      const retry = result === 'retry' && job.attempts < 5;
      const status = retry ? 'pending' : result === 'sent' ? 'sent' : 'dropped';
      const updates = retry
        ? { state: status, next_attempt_at: new Date(Date.now() + 60_000 * 2 ** job.attempts).toISOString() }
        : { state: status };
      const { error: failure } = await db.from('mobile_task_push_jobs').update(updates)
        .eq('id', job.job_id).eq('attempts', job.attempts).eq('state', 'pending');
      return failure ? 'unrecorded' : status;
    }));
    return Response.json({ claimed: results.length, sent: results.filter(state => state === 'sent').length,
      retrying: results.filter(state => state === 'pending').length,
      dropped: results.filter(state => state === 'dropped' || state === 'unregistered').length,
      unrecorded: results.filter(state => state === 'unrecorded').length });
  } catch {
    return Response.json({ status: 'delivery_unavailable' }, { status: 503 });
  }
});
