import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

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
    const rl = rateLimit(`confirm:${userId}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const { paymentIntentId } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // جلب تفاصيل الدفع من Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (paymentIntent.status === 'succeeded') {
      // تحديث حالة الدفع في قاعدة البيانات
      await supabase
        .from('payment_intents')
        .update({
          status: 'succeeded',
          paid_at: new Date().toISOString(),
          stripe_payment_method_id: paymentIntent.payment_method
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      // تحديث حالة الفاتورة إذا كانت موجودة
      if (paymentIntent.metadata.invoiceId) {
        await supabase
          .from('invoices')
          .update({
            payment_status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            total_paid_amount: paymentIntent.amount / 100,
            remaining_amount: 0
          })
          .eq('id', paymentIntent.metadata.invoiceId);
      }

      // تحديث حالة الحجز إذا كان موجود
      if (paymentIntent.metadata.bookingId) {
        const booking = await supabase
          .from('hotel_bookings')
          .select('total_cost_customer, paid_amount')
          .eq('id', paymentIntent.metadata.bookingId)
          .single();

        if (booking.data) {
          const newPaidAmount = (booking.data.paid_amount || 0) + (paymentIntent.amount / 100);
          const remainingAmount = booking.data.total_cost_customer - newPaidAmount;

          await supabase
            .from('hotel_bookings')
            .update({
              paid_amount: newPaidAmount,
              remaining_amount: remainingAmount
            })
            .eq('id', paymentIntent.metadata.bookingId);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم الدفع بنجاح',
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'فشل في عملية الدفع',
          status: paymentIntent.status
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

  } catch (error: unknown) {
    console.error('خطأ في تأكيد الدفع:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});