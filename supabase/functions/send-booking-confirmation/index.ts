import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireOrgMembership } from "../_shared/auth.ts";


type ConfirmationResult = {
  email: 'queued' | 'sent' | 'failed' | 'skipped';
  whatsapp: 'sent' | 'failed' | 'skipped' | 'pending';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    const { bookingId, bookingType } = body ?? {};

    if (typeof bookingId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(bookingId)
      || typeof bookingType !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing bookingId or bookingType' }), { status: 400, headers: corsHeaders });
    }

    // Determine table and fetch booking with customer info
    const tableMap: Record<string, string> = {
      hotel: 'hotel_bookings',
      flight: 'flight_bookings',
      transport: 'transport_bookings',
      car_rental: 'car_rentals',
    };

    if (!Object.hasOwn(tableMap, bookingType)) {
      return new Response(JSON.stringify({ error: 'Invalid booking type' }), { status: 400, headers: corsHeaders });
    }

    const { data: booking, error: fetchError } = await anonClient
      .from(tableMap[bookingType])
      .select('*, customer:customers(id, name, phone, email, organization_id, archived_at, whatsapp_opt_out), status:booking_statuses(name)')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: corsHeaders });
    }

    // AuthZ: the booking must belong to an organization the caller is a member of
    try {
      await requireOrgMembership(supabase, user.id, booking.organization_id);
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }


    const confirmed = booking.status?.name?.trim().toLowerCase() === 'confirmed';
    const customer = confirmed && booking.customer?.organization_id === booking.organization_id
      && !booking.customer.archived_at ? booking.customer : null;
    const bookingRef = booking.booking_reference || booking.rental_reference || bookingId.slice(0, 8);
    const customerName = booking.customer_name || customer?.name || 'عميل';
    const results: ConfirmationResult = { email: 'skipped', whatsapp: 'skipped' };

    if (customer?.email) {
      try {
        const amount = bookingType === 'hotel' ? booking.total_cost_customer
          : bookingType === 'car_rental' ? booking.total_rental_cost : booking.total_cost;
        const { data: state, error } = await supabase.rpc('enqueue_approved_transactional_email', {
          _org: booking.organization_id,
          _source: 'booking_confirmation',
          _key: `${bookingType}:${bookingId}`,
          _type: 'booking_confirmation',
          _recipient: customer.email,
          _name: customerName,
          _subject: `تأكيد الحجز - ${bookingRef}`,
          _data: {
            customer_name: customerName,
            booking_reference: bookingRef,
            booking_type: bookingType,
            date: booking.departure_date || booking.check_in_date || booking.rental_start_date,
            amount: amount ?? undefined,
            currency: booking.currency,
            hotel_name: booking.hotel_name,
          },
        });
        if (error) throw error;
        results.email = state === 'sent' ? 'sent' : ['pending', 'processing'].includes(state) ? 'queued' : 'failed';
      } catch {
        console.error('Booking confirmation email could not be queued');
        results.email = 'failed';
      }
    }

    if (customer?.phone && !customer.whatsapp_opt_out) {
      try {
        const { data, error } = await anonClient.functions.invoke('send-whatsapp-message', {
          body: {
            customerId: customer.id,
            organizationId: booking.organization_id,
            messageType: 'text',
            content: `✅ تأكيد حجز\n\nعزيزي ${customerName}،\nتم تأكيد حجزك رقم: ${bookingRef}\n\nشكراً لاختياركم خدماتنا.`,
            idempotencyKey: `booking-confirmation:${bookingType}:${bookingId}`,
          },
        });
        if (error || !data?.success) throw error ?? new Error('WhatsApp confirmation was rejected');
        const accepted = data.providerMessageId || ['sent', 'delivered', 'read'].includes(data.message?.status);
        results.whatsapp = accepted ? 'sent' : 'pending';
      } catch (error) {
        console.error('Booking confirmation WhatsApp could not be sent', error);
        results.whatsapp = 'failed';
      }
    }

    const sent = results.email === 'sent' || results.whatsapp === 'sent';
    const failed = results.email === 'failed' || results.whatsapp === 'failed';
    const queued = results.email === 'queued' || results.whatsapp === 'pending';
    const status = failed && (sent || queued) ? 'partial'
      : sent ? 'sent'
      : queued ? 'pending'
      : failed ? 'failed'
      : 'skipped';
    return new Response(JSON.stringify({ success: sent && !failed, status, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
