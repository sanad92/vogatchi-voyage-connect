import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const fallback = await readFile(new URL('../../.env', import.meta.url), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
});
const workspace = parseEnv(fallback);
const url = new URL(process.env.VITE_SUPABASE_URL ?? workspace.VITE_SUPABASE_URL ?? '');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? workspace.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
let anonymous = key.startsWith('sb_publishable_');
if (!anonymous) {
  try {
    anonymous = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon';
  } catch {
    anonymous = false;
  }
}
if (url.protocol !== 'https:' || url.username || url.password || !anonymous) {
  throw new Error('A HTTPS Supabase URL and a publishable or anon key are required.');
}
const manifest = process.env.VITE_ANDROID_UPDATE_MANIFEST_URL ?? workspace.VITE_ANDROID_UPDATE_MANIFEST_URL;
const androidUpdateManifestUrl = manifest ? new URL(manifest) : null;
if (androidUpdateManifestUrl && (androidUpdateManifestUrl.protocol !== 'https:' ||
  androidUpdateManifestUrl.username || androidUpdateManifestUrl.password)) {
  throw new Error('Use an HTTPS Android update manifest URL without embedded credentials.');
}
await writeFile(new URL('../src/runtime.generated.ts', import.meta.url),
  'export const runtime = ' + JSON.stringify({
    supabaseUrl: url.origin,
    supabaseKey: key,
    androidUpdateManifestUrl: androidUpdateManifestUrl?.href ?? null,
  }, null, 2) + ';\n');
