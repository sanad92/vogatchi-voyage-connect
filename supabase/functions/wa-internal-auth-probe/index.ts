// TEMPORARY diagnostic: reports only header *shapes* (never values) seen on an
// internal function-to-function call, and the chatbot's status for an empty body.
import { createClient } from 'npm:@supabase/supabase-js@2';

const kind = (v: string | null) => !v ? 'none' : v.startsWith('sb_secret_') ? 'sb_secret'
  : v.startsWith('sb_publishable_') ? 'sb_publishable' : v.split('.').length === 3 ? 'jwt' : 'other';

Deno.serve(async (req) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const url = new URL(req.url);
  if (url.searchParams.get('echo') === '1') {
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const apikey = req.headers.get('apikey');
    return Response.json({ bearerKind: kind(bearer), bearerMatchesEnv: bearer === key,
      apikeyKind: kind(apikey), apikeyMatchesEnv: apikey === key });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, key);
  const echo = await db.functions.invoke('wa-internal-auth-probe?echo=1', { body: {} });
  const bot = await db.functions.invoke('whatsapp-chatbot-reply', { body: { dry_run: true } });
  const u = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-chatbot-reply`;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const noAuth = (await fetch(u, { method: 'POST', body: JSON.stringify({ dry_run: true }) })).status;
  const anon = (await fetch(u, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ dry_run: true }) })).status;
  const forged = (await fetch(u, { method: 'POST', headers: { apikey: 'sb_secret_forged' }, body: JSON.stringify({ dry_run: true }) })).status;
  return Response.json({
    envKeyKind: kind(key), internalSecretSet: !!Deno.env.get('INTERNAL_FUNCTION_SECRET'),
    echo: echo.data ?? null, echoErr: echo.error ? (echo.error as any).context?.status ?? 'err' : null,
    chatbotStatus: bot.error ? (bot.error as any).context?.status ?? 'err' : 200, chatbotBody: bot.data ?? null, noAuth, anon, forged,
  });
});
