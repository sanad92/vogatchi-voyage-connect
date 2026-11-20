import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../integrations/supabase/types";
import { z } from "zod";
import type { JsonValueInput, ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // Malformed dictionary; fall through to legacy names.
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required");
}

/** Forwards the verified bearer token so RLS runs as the signed-in user. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient<Database>(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Connect this app with your account first." }],
    isError: true,
  };
}

export function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function rows(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
    structuredContent: { data: JSON.parse(JSON.stringify(data ?? [])) as JsonValueInput },
  };
}


export const organizationInput = z.string().uuid()
  .describe("Organization ID returned by list_organizations. Required for accounts with more than one organization.")
  .optional();

export function activeMemberships(supabase: SupabaseClient<Database>, userId: string) {
  return supabase.from("organization_members")
    .select("organization_id, organizations!inner(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("organizations.is_active", true);
}

export async function scopedOrganization(ctx: ToolContext, organizationId?: string) {
  const userId = ctx.getUserId();
  if (!ctx.isAuthenticated() || !userId) return { error: unauthenticated() };

  const supabase = supabaseForUser(ctx);
  const memberships = activeMemberships(supabase, userId);
  if (organizationId) memberships.eq("organization_id", organizationId);
  const { data, error } = await memberships.limit(2);
  if (error) return { error: failure("Could not check organization access.") };
  if (!data.length) return { error: failure("Organization is unavailable to this account. Use list_organizations.") };
  if (data.length > 1) return { error: failure("Choose an organization with list_organizations and pass its organization_id.") };
  return { supabase, organizationId: data[0].organization_id };
}
