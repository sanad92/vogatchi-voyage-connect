import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/send-invitation-email/index.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

const invitationId = '00000000-0000-4000-8000-000000000001';
const token = '00000000-0000-4000-8000-000000000002';
const invite = {
  id: invitationId,
  organization_id: 'fixture-agency',
  email: 'staff@agency.example',
  role: 'viewer',
  token,
  status: 'pending',
  expires_at: '2099-01-01',
  invited_by: 'fixture-owner',
};

async function sendInvitation(siteUrl) {
  let serve;
  const messages = [];
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: invite.invited_by } } }) },
    from: table => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: {
            invitations: invite,
            organizations: { name: 'Fixture Agency' },
            profiles: { full_name: 'Fixture Owner' },
          }[table] }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
    rpc: async name => ({ data: name === 'get_user_org_role' ? 'owner' : false }),
  };
  const imports = {
    'npm:react@18.3.1': { createElement: (_component, props) => props },
    'npm:react-dom@18.3.1/server': {
      renderToStaticMarkup: ({ acceptUrl }) => `<a href="${acceptUrl}">Invitation</a>`,
    },
    'npm:@supabase/supabase-js@2': { createClient: () => client },
    'npm:@supabase/supabase-js@2/cors': { corsHeaders: {} },
    'npm:@lovable.dev/email-js@0.8.0': {
      EmailAPIError: class extends Error {},
      sendLovableEmail: async message => messages.push(message),
    },
    '../_shared/email-templates/organization-invite.tsx': { OrganizationInviteEmail: () => null },
  };
  vm.runInNewContext(outputText, {
    exports: {}, require: name => imports[name], URL, Request, Response, console,
    Deno: {
      serve: handler => { serve = handler; },
      env: { get: name => ({ SITE_URL: siteUrl, LOVABLE_API_KEY: 'fixture-key' })[name] },
    },
  });

  const response = await serve(new Request('https://database.example/send-invitation-email', {
    method: 'POST',
    headers: { Authorization: 'Bearer fixture-user', Origin: 'https://unrelated.example' },
    body: JSON.stringify({ invitation_id: invitationId }),
  }));
  return { status: response.status, messages };
}

const staging = await sendInvitation('https://staging.example/');
assert.equal(staging.status, 200);
assert.equal(staging.messages.length, 1);
assert.ok(staging.messages[0].html.includes(`href="https://staging.example/accept-invite?token=${token}"`));
assert.equal(staging.messages[0].to, invite.email);

const defaultSite = await sendInvitation(undefined);
assert.equal(defaultSite.status, 200);
assert.ok(defaultSite.messages[0].html.includes(`href="https://safarerp.com/accept-invite?token=${token}"`));

for (const invalid of ['staging.example', 'http://staging.example', 'https://user:secret@staging.example']) {
  const rejected = await sendInvitation(invalid);
  assert.equal(rejected.status, 500);
  assert.equal(rejected.messages.length, 0);
}
console.log('Staff invitation links follow the server-configured HTTPS origin and use the production default when unset.');
