import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { bookingEmailTables, sendTransactionalEmail, type ClaimedEmail, type DispatchOutcome } from './transactional-email-dispatch.ts';

export const DEFAULT_TRANSACTIONAL_SENDER = 'Safar ERP <noreply@vogatchi.com>';

export interface DispatchSettings {
  apiKey: string;
  sender: string;
}

export function transactionalEmailSettings(): DispatchSettings | null {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  if (!apiKey || Deno.env.get('EMAIL_QUEUE_DISPATCH_ENABLED') !== 'true') return null;
  return { apiKey, sender: Deno.env.get('EMAIL_QUEUE_FROM')?.trim() || DEFAULT_TRANSACTIONAL_SENDER };
}

const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

async function recipientIsCurrent(admin: SupabaseClient, email: ClaimedEmail): Promise<boolean> {
  const recipient = normalizeEmail(email.recipient_email);
  if (email.dispatch_source === 'organization_onboarding') {
    const [membership, contact] = await Promise.all([
      admin.from('organization_members').select('id').eq('organization_id', email.organization_id)
        .eq('user_id', email.dispatch_key).eq('role', 'owner').eq('is_active', true).maybeSingle(),
      admin.auth.admin.getUserById(email.dispatch_key),
    ]);
    if (membership.error || (contact.error && contact.error.status !== 404)) throw new Error('onboarding_lookup_failed');
    return Boolean(membership.data && contact.data?.user?.email_confirmed_at && recipient === normalizeEmail(contact.data.user.email));
  }

  if (email.dispatch_source === 'customer_registration') {
    const [customerId] = email.dispatch_key.split(':');
    const { data, error } = await admin.from('customers').select('email')
      .eq('id', customerId).eq('organization_id', email.organization_id)
      .eq('is_demo', false).is('archived_at', null).maybeSingle();
    if (error) throw new Error('customer_lookup_failed');
    return Boolean(data && recipient === normalizeEmail(data.email));
  }

  if (email.dispatch_source === 'booking_confirmation') {
    const [kind, bookingId] = email.dispatch_key.split(':');
    if (!Object.hasOwn(bookingEmailTables, kind) || !bookingId) return false;
    const { data, error } = await admin
      .from(bookingEmailTables[kind as keyof typeof bookingEmailTables])
      .select('customer:customers(email,organization_id,archived_at),status:booking_statuses(name)')
      .eq('id', bookingId).eq('organization_id', email.organization_id).maybeSingle();
    if (error) throw new Error('booking_lookup_failed');
    const booking = data as unknown as {
      customer: { email: string | null; organization_id: string; archived_at: string | null } | null;
      status: { name: string } | null;
    } | null;
    return Boolean(booking?.status?.name?.trim().toLowerCase() === 'confirmed'
      && booking.customer?.organization_id === email.organization_id && !booking.customer.archived_at
      && recipient === normalizeEmail(booking.customer.email));
  }

  return false;
}

export async function processClaimedEmail(
  admin: SupabaseClient, email: ClaimedEmail, settings: DispatchSettings,
): Promise<DispatchOutcome> {
  let outcome: DispatchOutcome;
  let providerId: string | undefined;
  try {
    if (await recipientIsCurrent(admin, email)) {
      const result = await sendTransactionalEmail(email, settings.apiKey, settings.sender);
      outcome = result.outcome;
      if (result.outcome === 'sent') providerId = result.providerId;
    } else {
      // A previous provider attempt may have accepted this message.
      outcome = email.attempts > 1 ? 'needs_review' : 'rejected';
    }
  } catch {
    outcome = 'retry';
  }
  if ((outcome === 'retry' && email.attempts >= Math.min(email.max_attempts, 3))
    || (outcome === 'rejected' && email.attempts > 1)) outcome = 'needs_review';

  const { data, error } = await admin.rpc('finish_transactional_email', {
    _email_id: email.id, _claim: email.dispatch_claim, _outcome: outcome, _provider_id: providerId ?? null,
  });
  if (error || data !== true) throw new Error('email_outcome_not_persisted');
  return outcome;
}
