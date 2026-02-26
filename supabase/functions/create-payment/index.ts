import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYMOB_BASE = "https://accept.paymob.com/api";

interface PaymentRequest {
  amount_cents: number;
  currency?: string;
  billing_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    city?: string;
    country?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    state?: string;
    zip_code?: string;
  };
  items?: Array<{
    name: string;
    amount_cents: number;
    quantity: number;
    description?: string;
  }>;
  merchant_order_id?: string;
}

async function getAuthToken(apiKey: string): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymob auth failed: ${err}`);
  }

  const data = await res.json();
  return data.token;
}

async function createOrder(
  authToken: string,
  amountCents: number,
  currency: string,
  merchantOrderId?: string,
  items?: any[]
): Promise<number> {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency,
      merchant_order_id: merchantOrderId,
      items: items || [],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymob order creation failed: ${err}`);
  }

  const data = await res.json();
  return data.id;
}

async function getPaymentKey(
  authToken: string,
  orderId: number,
  amountCents: number,
  currency: string,
  integrationId: number,
  billingData: PaymentRequest["billing_data"]
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        first_name: billingData.first_name,
        last_name: billingData.last_name,
        email: billingData.email,
        phone_number: billingData.phone_number,
        city: billingData.city || "Cairo",
        country: billingData.country || "EG",
        street: billingData.street || "N/A",
        building: billingData.building || "N/A",
        floor: billingData.floor || "N/A",
        apartment: billingData.apartment || "N/A",
        state: billingData.state || "N/A",
        zip_code: billingData.zip_code || "N/A",
        shipping_method: "N/A",
        postal_code: billingData.zip_code || "N/A",
      },
      currency,
      integration_id: integrationId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paymob payment key failed: ${err}`);
  }

  const data = await res.json();
  return data.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    // Rate limit: 10 payment requests per minute per user
    const rl = rateLimit(`payment:${userId}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    // Parse request body
    const body: PaymentRequest = await req.json();

    // Validate required fields
    if (!body.amount_cents || body.amount_cents < 100) {
      return new Response(
        JSON.stringify({ error: "المبلغ غير صالح. الحد الأدنى 100 قرش (1 جنيه)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.billing_data?.first_name || !body.billing_data?.last_name || !body.billing_data?.email || !body.billing_data?.phone_number) {
      return new Response(
        JSON.stringify({ error: "بيانات الفوترة مطلوبة: first_name, last_name, email, phone_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Paymob credentials from env
    const apiKey = Deno.env.get("PAYMOB_API_KEY");
    const integrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");

    if (!apiKey || !integrationId || !iframeId) {
      console.error("Missing Paymob configuration");
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات بوابة الدفع" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currency = body.currency || "EGP";

    // Step 1: Get auth token
    const paymobAuthToken = await getAuthToken(apiKey);

    // Step 2: Create order
    const orderId = await createOrder(
      paymobAuthToken,
      body.amount_cents,
      currency,
      body.merchant_order_id,
      body.items
    );

    // Step 3: Get payment key
    const paymentKey = await getPaymentKey(
      paymobAuthToken,
      orderId,
      body.amount_cents,
      currency,
      parseInt(integrationId),
      body.billing_data
    );

    // Step 4: Build iframe URL
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    return new Response(
      JSON.stringify({
        success: true,
        iframe_url: iframeUrl,
        order_id: orderId,
        payment_token: paymentKey,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Payment error:", error.message);
    return new Response(
      JSON.stringify({ error: "فشل في إنشاء عملية الدفع", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
