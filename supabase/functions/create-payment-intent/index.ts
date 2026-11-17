import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { requireOrgMembership, AuthError, authErrorResponse } from '../_shared/auth.ts';


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const rl = rateLimit(`stripe:${userId}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const { amount: requestedAmount, bookingId, invoiceId } = await req.json();
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // The charged amount is always derived from the invoice record, never from the request.
    if (typeof invoiceId !== 'string' || !UUID.test(invoiceId)) {
      return new Response(JSON.stringify({ error: 'invoiceId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (bookingId != null && (typeof bookingId !== 'string' || !UUID.test(bookingId))) {
      return new Response(JSON.stringify({ error: 'Invalid bookingId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let amount = 0;
    let currency = 'egp';
    let description = '';

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // AuthZ: the referenced invoice/booking must belong to the caller's organization
    try {
      if (invoiceId) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('organization_id, invoice_number, currency, final_amount, total_paid_amount, remaining_amount, status, payment_status')
          .eq('id', invoiceId).maybeSingle();
        if (!inv) throw new AuthError('Invoice not found', 404);
        await requireOrgMembership(supabase, userId, inv.organization_id);
        if (['cancelled', 'void', 'draft'].includes(String(inv.status || '').toLowerCase())) {
          throw new AuthError('Invoice is not payable', 409);
        }
        const remaining = Math.max(0, Number(
          inv.remaining_amount ?? (Number(inv.final_amount || 0) - Number(inv.total_paid_amount || 0)),
        ) || 0);
        if (!(remaining > 0)) throw new AuthError('Invoice already paid', 409);
        // Partial payments are allowed only up to the server-side outstanding balance.
        amount = typeof requestedAmount === 'number' && isFinite(requestedAmount) && requestedAmount > 0
          ? Math.min(requestedAmount, remaining) : remaining;
        currency = String(inv.currency || 'EGP').toLowerCase();
        description = `دفع فاتورة ${inv.invoice_number || invoiceId}`;
      }
      if (bookingId) {
        const { data: bk } = await supabase
          .from('hotel_bookings').select('organization_id').eq('id', bookingId).maybeSingle();
        if (!bk) throw new AuthError('Booking not found', 404);
        await requireOrgMembership(supabase, userId, bk.organization_id);
      }
    } catch (e) {
      const res = authErrorResponse(e, corsHeaders);
      if (res) return res;
      throw e;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });


    // إنشاء PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // تحويل للpiastres
      currency: currency.toLowerCase(),
      description,
      metadata: {
        bookingId: bookingId || '',
        invoiceId: invoiceId || '',
        systemId: 'vista-travel'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // حفظ بيانات الدفع في قاعدة البيانات


    await supabase.from('payment_intents').insert({
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      currency: currency,
      booking_id: bookingId,
      invoice_id: invoiceId,
      status: 'pending',
      description: description
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('خطأ في إنشاء PaymentIntent:', error);
    return new Response(
      JSON.stringify({ error: 'تعذّر إنشاء عملية الدفع' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});