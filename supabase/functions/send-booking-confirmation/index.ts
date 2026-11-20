import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireOrgMembership } from "../_shared/auth.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    const { bookingId, bookingType } = await req.json();

    if (!bookingId || !bookingType) {
      return new Response(JSON.stringify({ error: 'Missing bookingId or bookingType' }), { status: 400, headers: corsHeaders });
    }

    // Determine table and fetch booking with customer info
    const tableMap: Record<string, string> = {
      hotel: 'hotel_bookings',
      flight: 'flight_bookings',
      transport: 'transport_bookings',
      car_rental: 'car_rentals',
    };

    const tableName = tableMap[bookingType];
    if (!tableName) {
      return new Response(JSON.stringify({ error: 'Invalid booking type' }), { status: 400, headers: corsHeaders });
    }

    const { data: booking, error: fetchError } = await supabase
      .from(tableName)
      .select('*, customer:customers(name, phone, email)')
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


    const customer = booking.customer;
    const bookingRef = booking.booking_reference || booking.rental_reference || bookingId.slice(0, 8);
    const customerName = booking.customer_name || customer?.name || 'عميل';

    const results: { email?: string; whatsapp?: string } = {};

    // 1. Queue confirmation email if customer has email
    if (customer?.email) {
      try {
        const { error } = await supabase.from('email_queue').insert({
          email_type: 'booking_confirmation',
          recipient_email: customer.email,
          recipient_name: customerName,
          subject: `تأكيد الحجز - ${bookingRef}`,
          template_data: {
            customer_name: customerName,
            booking_reference: bookingRef,
            booking_type: bookingType,
            details: {
              departure_date: booking.departure_date || booking.check_in_date || booking.rental_start_date,
              pickup_location: booking.pickup_location || booking.hotel_name || '',
              total_cost: booking.total_cost || booking.total_rental_cost || booking.total_cost_customer || 0,
            }
          },
          organization_id: booking.organization_id,
          status: 'pending',
        });
        if (error) throw error;
        results.email = 'queued';
      } catch (e) {
        console.error('Email queue error:', e);
        results.email = 'failed';
      }
    }

    // 2. Send WhatsApp confirmation if customer has phone
    if (customer?.phone) {
      try {
        const message = `✅ تأكيد حجز\n\nعزيزي ${customerName}،\nتم تأكيد حجزك رقم: ${bookingRef}\n\nشكراً لاختياركم خدماتنا.`;

        const { data, error } = await anonClient.functions.invoke('send-whatsapp-message', {
          headers: { Authorization: authHeader },
          body: {
            organizationId: booking.organization_id,
            customerId: booking.customer_id,
            to: customer.phone,
            messageType: 'text',
            content: message,
            idempotencyKey: `booking-confirmation:${bookingType}:${bookingId}`,
          }
        });
        if (error) throw error;
        const providerAccepted = data?.providerMessageId || (
          data?.message?.message_id && ['sent', 'delivered', 'read'].includes(data.message.status)
        );
        if (data?.success !== true || !providerAccepted) {
          throw new Error('WhatsApp provider acceptance is unconfirmed');
        }
        results.whatsapp = 'sent';
      } catch (e) {
        console.error('WhatsApp send error:', e);
        results.whatsapp = 'failed';
      }
    }

    // Neither channel sends a voucher; its delivery is recorded by the voucher workflow.
    const channels = Object.values(results);
    const success = channels.length > 0 && channels.every(result => result !== 'failed');
    return new Response(JSON.stringify({ success, results }), {
      status: success ? 200 : channels.length ? 502 : 422,
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
