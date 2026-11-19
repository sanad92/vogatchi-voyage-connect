import { brokeredPreviewStorage } from '@/integrations/supabase/previewAuthStorage';

const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
const authKey = `sb-${projectRef}-auth-token`;
const authKeys = [authKey, `${authKey}-code-verifier`, `${authKey}-user`];

export async function cleanupAuthState(): Promise<void> {
  try {
    const storage = brokeredPreviewStorage();
    await Promise.allSettled(authKeys.map(key => Promise.resolve().then(() => storage?.removeItem(key))));
  } catch {
    // Auth state is still closed in memory if browser storage cannot be opened.
  }
}
