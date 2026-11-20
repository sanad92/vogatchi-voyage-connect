import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build, loadConfigFromFile } from 'vite';
import { extractWhatsAppLeadDraft } from '../supabase/functions/_shared/whatsapp-lead-draft.ts';
import { conversation, customer, message, organization, photoPath, revision } from './fixtures/whatsapp-browser/session.ts';

const repo = fileURLToPath(new URL('../', import.meta.url));
const fixture = path.join(repo, 'scripts/fixtures/whatsapp-browser');
const temp = await mkdtemp(path.join(tmpdir(), 'safar-whatsapp-browser-'));
const dist = path.join(temp, 'dist');
const originHost = '127.0.0.1';
const fixturePhoto = await readFile(path.join(repo, 'scripts/fixtures/whatsapp-identity-review/arabic.png'));
const scopedReview = { _organization: organization, _conversation: conversation, _message: message };
const mediaPrefix = /^\/storage\/v1\/object\/(?:authenticated\/)?whatsapp-media\//;
const leadText = 'فندق في الغردقة، من ٢٠٢٦-١٢-١٩ إلى ٢٠٢٦-١٢-٢٤، عدد البالغين: ٢، الميزانية ١٥٠٠٠ جنيه';
const calls = { draft: 0, leadSave: 0, identitySave: 0, media: 0 };
let driver;
let driverRequest;
let session;
let server;
let lead;
let fixtureError;

try {
  const { config } = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(repo, 'vite.config.ts'));
  const plugins = config.plugins.flat(Infinity).filter(plugin =>
    plugin && (plugin.name.startsWith('vite:react-swc') || plugin.name === 'safar-identity-ocr-models'));
  assert.ok(plugins.some(plugin => plugin.name === 'safar-identity-ocr-models'));
  const authHooks = ['useOptimizedAuth', 'useOrgId', 'usePermissionCheck', 'useSupabasePermissions'];
  await build({
    configFile: false,
    root: fixture,
    plugins,
    publicDir: false,
    build: { outDir: dist, emptyOutDir: true },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': 'window.location.origin',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-public-key'),
    },
    resolve: {
      alias: [
        ...authHooks.map(hook => ({ find: `@/hooks/${hook}`, replacement: path.join(fixture, 'session.ts') })),
        { find: '@', replacement: path.join(repo, 'src') },
      ],
    },
  });

  if (!process.argv.includes('--build-only')) {
    server = createServer((request, response) => {
      serve(request, response).catch(error => {
        fixtureError ??= error;
        reply(response, 500, { message: 'Fixture assertion failed.' });
      });
    });
    server.listen(0, originHost);
    await once(server, 'listening');
    const baseUrl = `http://${originHost}:${server.address().port}`;

    driver = spawn('chromedriver', ['--port=0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('ChromeDriver did not start.')), 10_000).unref();
      const finish = (callback, value) => { clearTimeout(timeout); callback(value); };
      driver.on('error', error => finish(reject, error));
      driver.on('exit', code => finish(reject, new Error(`ChromeDriver exited with ${code}.`)));
      driver.stderr.on('data', chunk => process.stderr.write(chunk));
      driver.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/was started successfully on port (\d+)/);
        if (match) finish(resolve, Number(match[1]));
      });
    });

    driverRequest = async (route, method = 'GET', body) => {
      const response = await fetch(`http://${originHost}:${port}${route}`, {
        method,
        ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(40_000),
      });
      const { value } = await response.json();
      if (!response.ok) throw new Error(`ChromeDriver ${route}: ${value?.message ?? response.status}`);
      return value;
    };
    const opened = await driverRequest('/session', 'POST', {
      capabilities: { alwaysMatch: {
        browserName: 'chrome',
        'goog:chromeOptions': { args: ['--headless', '--disable-dev-shm-usage', '--disable-background-networking', '--no-sandbox'] },
      } },
    });
    session = `/session/${opened.sessionId}`;
    for (const scenario of ['lead', 'repeat', 'identity']) {
      await driverRequest(`${session}/url`, 'POST', { url: `${baseUrl}/?scenario=${scenario}` });
      const deadline = Date.now() + 45_000;
      let result;
      while (!result && Date.now() < deadline) {
        result = await driverRequest(`${session}/execute/sync`, 'POST', {
          script: 'return document.body.dataset.smoke || null;',
          args: [],
        });
        if (fixtureError) throw fixtureError;
        if (!result) await delay(100);
      }
      assert.equal(result, 'passed', `Browser scenario ${scenario}: ${result ?? 'no completion marker'}`);
      console.log(`WhatsApp browser scenario passed: ${scenario}`);
    }
    assert.deepEqual(calls, { draft: 1, leadSave: 1, identitySave: 1, media: 1 });
  }
} finally {
  if (session) await driverRequest(session, 'DELETE').catch(() => {});
  driver?.kill();
  server?.close();
  server?.closeAllConnections();
  await rm(temp, { recursive: true, force: true });
}

async function serve(request, response) {
  const url = new URL(request.url, `http://${originHost}`);
  const { pathname } = url;
  if (request.method === 'POST') {
    let text = '';
    for await (const chunk of request) text += chunk;
    const body = JSON.parse(text);
    if (pathname === '/functions/v1/ai-extract-lead') {
      calls.draft++;
      assert.deepEqual(body, { organization_id: organization, conversation_id: conversation });
      return reply(response, 200, { success: true, data: extractWhatsAppLeadDraft([leadText]) });
    }
    if (pathname === '/rest/v1/rpc/sop_save_whatsapp_lead') {
      calls.leadSave++;
      assert.equal(body._org, organization);
      assert.equal(body._conversation, conversation);
      assert.equal(body._payload.lead_source, 'whatsapp');
      assert.equal(body._payload.destination, 'الجونة');
      lead = {
        ...body._payload, id: 'synthetic-lead', conversation_id: conversation, organization_id: organization,
        lead_number: 'WA-QA-0001', stage: 'new', owner_department: 'sales',
        children_count: 0, children_ages: [], arrived_at: revision, updated_at: revision,
      };
      return reply(response, 200, { allowed: true, lead });
    }
    if (pathname === '/rest/v1/rpc/review_whatsapp_identity_attachment') {
      assert.deepEqual(body, scopedReview);
      return reply(response, 200, {
        storage_path: photoPath,
        mime_type: 'image/png',
        customer: { id: customer, name: 'Synthetic Original Name', nationality: null, updated_at: revision },
      });
    }
    if (pathname === '/rest/v1/rpc/apply_whatsapp_identity_review') {
      calls.identitySave++;
      assert.deepEqual(body, {
        ...scopedReview, _customer: customer, _source_path: photoPath, _expected_updated_at: revision,
        _name: 'مسافر تجريبي', _nationality: 'مصري',
      });
      return reply(response, 200, customer);
    }
  }
  if (pathname === '/rest/v1/sop_leads') {
    assert.equal(url.searchParams.get('organization_id'), `eq.${organization}`);
    return reply(response, 200, lead ? [lead] : []);
  }
  if (pathname.startsWith('/rest/v1/')) return reply(response, 200, []);
  if (pathname.replace(mediaPrefix, '') === photoPath) {
    calls.media++;
    return reply(response, 200, fixturePhoto, 'image/png');
  }
  if (pathname === '/fixture-photo.png') return reply(response, 200, fixturePhoto, 'image/png');
  if (pathname === '/favicon.ico') return reply(response, 204, '', 'text/plain');
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  assert.match(relative, /^(?:index\.html|assets\/(?:[\w.-]+\/)*[\w.-]+)$/);
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.gz': 'application/gzip' };
  return reply(response, 200, await readFile(path.join(dist, relative)), mime[path.extname(relative)]);
}

function reply(response, status, data, mime = 'application/json') {
  response.writeHead(status, {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'none'",
  });
  response.end(mime === 'application/json' ? JSON.stringify(data) : data);
}
