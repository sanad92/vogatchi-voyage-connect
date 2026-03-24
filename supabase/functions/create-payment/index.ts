import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYMOB_BASE = "https://accept.paymob.com/api";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]{6,20}$/;
const MAX_STRING_LENGTH = 200;
const MAX_AMOUNT_CENTS = 100_000_000; // 1M EGP

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

function sanitizeString(val: unknown, maxLen = MAX_STRING_LENGTH): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
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
        first_name: sanitizeString(billingData.first_name),
        last_name: sanitizeString(billingData.last_name),
        email: sanitizeString(billingData.email, 255),
        phone_number: sanitizeString(billingData.phone_number, 20),
        city: sanitizeString(billingData.city) || "Cairo",
        country: sanitizeString(billingData.country, 2) || "EG",
        street: sanitizeString(billingData.street) || "N/A",
        building: sanitizeString(billingData.building) || "N/A",
        floor: sanitizeString(billingData.floor) || "N/A",
        apartment: sanitizeString(billingData.apartment) || "N/A",
        state: sanitizeString(billingData.state) || "N/A",
        zip_code: sanitizeString(billingData.zip_code, 10) || "N/A",
        shipping_method: "N/A",
        postal_code: sanitizeString(billingData.zip_code, 10) || "N/A",
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
    return new Response("ok", { status: 200, headers: corsHeaders });
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    // Rate limit: 10 payment requests per minute per user
    const rl = rateLimit(`payment:${userId}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    // Parse request body
    const body: PaymentRequest = await req.json();

    // === Input Validation ===
    if (!body.amount_cents || typeof body.amount_cents !== 'number' || !Number.isInteger(body.amount_cents) || body.amount_cents < 100 || body.amount_cents > MAX_AMOUNT_CENTS) {
      return new Response(
        JSON.stringify({ error: `المبلغ غير صالح. الحد الأدنى 100 قرش والحد الأقصى ${MAX_AMOUNT_CENTS} قرش` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.billing_data || typeof body.billing_data !== 'object') {
      return new Response(
        JSON.stringify({ error: "بيانات الفوترة مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { first_name, last_name, email, phone_number } = body.billing_data;

    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0 || first_name.length > MAX_STRING_LENGTH) {
      return new Response(
        JSON.stringify({ error: "الاسم الأول مطلوب وأقصى طول 200 حرف" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0 || last_name.length > MAX_STRING_LENGTH) {
      return new Response(
        JSON.stringify({ error: "اسم العائلة مطلوب وأقصى طول 200 حرف" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "بريد إلكتروني غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone_number || typeof phone_number !== 'string' || !PHONE_REGEX.test(phone_number.trim())) {
      return new Response(
        JSON.stringify({ error: "رقم هاتف غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.merchant_order_id && (typeof body.merchant_order_id !== 'string' || body.merchant_order_id.length > 100)) {
      return new Response(
        JSON.stringify({ error: "merchant_order_id غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.currency && (typeof body.currency !== 'string' || !/^[A-Z]{3}$/i.test(body.currency))) {
      return new Response(
        JSON.stringify({ error: "عملة غير صالحة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Paymob credentials from env
    const apiKey = Deno.env.get("PAYMOB_API_KEY");
    const integrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");

    if (!apiKey || !integrationId || !iframeId) {
      console.error("Missing Paymob configuration:", { apiKey: !!apiKey, integrationId, iframeId });
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات بوابة الدفع" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedIntegrationId = parseInt(integrationId, 10);
    if (isNaN(parsedIntegrationId)) {
      console.error("PAYMOB_INTEGRATION_ID is not a valid number:", integrationId);
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات بوابة الدفع - integration_id غير صالح" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currency = (body.currency || "EGP").toUpperCase();
    const sanitizedMerchantOrderId = body.merchant_order_id ? sanitizeString(body.merchant_order_id, 100) : undefined;

    // Step 1: Get auth token
    const paymobAuthToken = await getAuthToken(apiKey);

    // Step 2: Create order
    const orderId = await createOrder(
      paymobAuthToken,
      body.amount_cents,
      currency,
      sanitizedMerchantOrderId,
      body.items
    );

    // Step 3: Get payment key
    const paymentKey = await getPaymentKey(
      paymobAuthToken,
      orderId,
      body.amount_cents,
      currency,
      parsedIntegrationId,
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
  } catch (error: unknown) {
    console.error("Payment error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: "فشل في إنشاء عملية الدفع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
