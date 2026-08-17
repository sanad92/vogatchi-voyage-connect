// Shared authentication / authorization helpers for edge functions.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Resolves the caller's authenticated user, or throws AuthError(401). */
export async function requireUser(req: Request): Promise<{ id: string }> {
  const token = bearerToken(req);
  if (!token) throw new AuthError('Unauthorized', 401);

  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) throw new AuthError('Unauthorized', 401);
  return { id: data.user.id };
}

/** Throws AuthError(403) unless the user is a member of the organization. */
export async function requireOrgMembership(
  admin: SupabaseClient,
  userId: string,
  organizationId: string | null | undefined,
): Promise<void> {
  if (!organizationId) throw new AuthError('Forbidden', 403);

  const { data: member } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (member) return;

  // Platform admins may operate across organizations.
  const { data: platform } = await admin
    .from('platform_roles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (platform) return;

  throw new AuthError('Forbidden', 403);
}

/** Convenience: authenticate + authorize against an organization. */
export async function requireOrgMember(
  req: Request,
  admin: SupabaseClient,
  organizationId: string | null | undefined,
): Promise<{ id: string }> {
  const user = await requireUser(req);
  await requireOrgMembership(admin, user.id, organizationId);
  return user;
}

/**
 * Internal-only endpoints: the caller must present the service-role key
 * (used when one edge function invokes another).
 */
export function requireInternalCaller(req: Request): void {
  const token = bearerToken(req);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  if (token && serviceKey && token === serviceKey) return;
  if (internalSecret && req.headers.get('x-internal-secret') === internalSecret) return;
  throw new AuthError('Unauthorized', 401);
}

export function authErrorResponse(err: unknown, headers: Record<string, string>): Response | null {
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
  return null;
}
