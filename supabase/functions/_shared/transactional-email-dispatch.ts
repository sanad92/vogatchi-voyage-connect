import { getEmailHtml, plainSubject } from './transactional-email-template.ts';

export const bookingEmailTables = {
  hotel: 'hotel_bookings',
  flight: 'flight_bookings',
  transport: 'transport_bookings',
  car_rental: 'car_rentals',
} as const;

export type DispatchOutcome = 'sent' | 'rejected' | 'retry' | 'needs_review';
type ProviderOutcome = { outcome: Exclude<DispatchOutcome, 'sent'> } | { outcome: 'sent'; providerId: string };

export interface ClaimedEmail {
  id: string;
  attempts: number;
  max_attempts: number;
  organization_id: string;
  dispatch_claim: string;
  dispatch_source: 'organization_onboarding' | 'booking_confirmation' | 'customer_registration';
  dispatch_key: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  template_data: Record<string, unknown>;
}

export async function sendTransactionalEmail(
  email: ClaimedEmail, apiKey: string, from: string, fetcher: typeof fetch = fetch,
): Promise<ProviderOutcome> {
  if (!/^[^\s,@;<>]+@[^\s,@;<>]+\.[^\s,@;<>]+$/.test(email.recipient_email)) return { outcome: 'rejected' };
  const { subject, html } = getEmailHtml(email.email_type, email.template_data);
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `safar-transactional-email/${email.id}`,
      },
      body: JSON.stringify({ from, to: [email.recipient_email], subject: plainSubject(email.subject) || subject, html }),
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const result = await response.json().catch(() => null);
      if (typeof result?.id === 'string' && result.id.trim() && result.id.length <= 200) {
        return { outcome: 'sent', providerId: result.id };
      }
      return { outcome: 'retry' };
    }
    // A concurrent idempotent request can return 409. The bounded retries
    // keep the same key, and unresolved outcomes are held for review.
    if (response.body) await response.body.cancel().catch(() => undefined);
    return { outcome: [408, 409, 425, 429].includes(response.status) || response.status >= 500 ? 'retry' : 'rejected' };
  } catch {
    return { outcome: 'retry' };
  }
}
