import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYMOB_BASE = "https://accept.paymob.com/api";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CheckoutRequest {
  organization_id: string;
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  checkout_session_id?: string;
}

interface BillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  country: string;
}

function sanitizeString(value: unknown, maxLength = 200): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function getAuthToken(apiKey: string): Promise<string> {
  const response = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!response.ok) throw new Error("Paymob authentication failed");
  return (await response.json()).token;
}

async function createOrder(
  authToken: string,
  amountCents: number,
  merchantOrderId: string,
  itemName: string,
): Promise<number> {
  const response = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items: [{ name: itemName, amount_cents: amountCents, quantity: 1, description: itemName }],
    }),
  });
  if (!response.ok) throw new Error("Paymob order creation failed");
  return (await response.json()).id;
}

async function getPaymentKey(
  authToken: string,
  orderId: number,
  amountCents: number,
  integrationId: number,
  billingData: BillingData,
): Promise<string> {
  const response = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        first_name: sanitizeString(billingData.first_name) || "N/A",
        last_name: sanitizeString(billingData.last_name) || "N/A",
        email: sanitizeString(billingData.email, 255),
        phone_number: sanitizeString(billingData.phone_number, 20) || "01000000000",
        city: sanitizeString(billingData.city) || "Cairo",
        country: "EG",
        street: "N/A",
        building: "N/A",
        floor: "N/A",
        apartment: "N/A",
        state: "N/A",
        zip_code: "N/A",
        shipping_method: "N/A",
        postal_code: "N/A",
      },
      currency: "EGP",
      integration_id: integrationId,
    }),
  });
  if (!response.ok) throw new Error("Paymob payment-key creation failed");
  return (await response.json()).token;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "جلسة غير صالحة" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = rateLimit(`subscription-checkout:${user.id}`, 6, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterMs, corsHeaders);

    const body = await request.json() as CheckoutRequest;
    if (
      !body || !UUID_RE.test(body.organization_id || "") ||
      !UUID_RE.test(body.plan_id || "") ||
      (body.checkout_session_id !== undefined && !UUID_RE.test(body.checkout_session_id)) ||
      !["monthly", "yearly"].includes(body.billing_cycle)
    ) {
      return new Response(JSON.stringify({ error: "بيانات الاشتراك غير صالحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: membership } = await admin
      .from("organization_members")
      .select("role,is_active")
      .eq("organization_id", body.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية شراء اشتراك لهذه الشركة" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("id,name,name_ar,price_monthly,price_yearly,is_active")
      .eq("id", body.plan_id)
      .eq("is_active", true)
      .single();
    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "الخطة غير متاحة" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = Number(body.billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly);
    const amountCents = Math.round(price * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents < 100) {
      throw new Error("Invalid server-side subscription price");
    }

    const apiKey = Deno.env.get("PAYMOB_API_KEY");
    const integrationIdRaw = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");
    const integrationId = Number(integrationIdRaw);
    if (!apiKey || !iframeId || !Number.isSafeInteger(integrationId) || integrationId<=0) {
      console.error("Paymob subscription checkout is not configured");
      return new Response(JSON.stringify({ error: "بوابة الدفع غير مهيأة حاليًا" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle();
    const nameParts = sanitizeString(profile?.full_name || user.email?.split("@")[0] || "User")
      .split(/\s+/).filter(Boolean);
    const billingData: BillingData = {
      first_name: nameParts[0] || "N/A",
      last_name: nameParts.slice(1).join(" ") || "N/A",
      email: user.email || "no-email@example.com",
      phone_number: profile?.phone || "01000000000",
      city: "Cairo",
      country: "EG",
    };

    const { data: preparedCheckout } = body.checkout_session_id
      ? await admin
        .from("payment_checkout_sessions")
        .select("*")
        .eq("id", body.checkout_session_id)
        .eq("organization_id", body.organization_id)
        .eq("plan_id", plan.id)
        .eq("billing_cycle", body.billing_cycle)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .maybeSingle()
      : { data: null };
    if (body.checkout_session_id && !preparedCheckout) {
      return new Response(JSON.stringify({ error: "جلسة الدفع غير صالحة أو منتهية" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (preparedCheckout && Number(preparedCheckout.amount_cents)!==amountCents) {
      throw new Error("Prepared checkout amount no longer matches plan price");
    }

    const attempt = crypto.randomUUID().slice(0, 8);
    const merchantOrderId = preparedCheckout?.merchant_order_id ||
      `org_${body.organization_id}_plan_${plan.id}_${body.billing_cycle}_${attempt}`;
    const itemName = `Vogantra ${plan.name_ar || plan.name} - ${body.billing_cycle === "yearly" ? "yearly" : "monthly"}`;

    const authToken = await getAuthToken(apiKey);
    const orderId = await createOrder(authToken, amountCents, merchantOrderId, itemName);
    const checkoutResult = preparedCheckout
      ? await admin
        .from("payment_checkout_sessions")
        .update({ paymob_order_id: String(orderId), updated_at: new Date().toISOString() })
        .eq("id", preparedCheckout.id)
        .select("id")
        .single()
      : await admin
        .from("payment_checkout_sessions")
        .insert({
          organization_id: body.organization_id,
          plan_id: plan.id,
          billing_cycle: body.billing_cycle,
          amount_cents: amountCents,
          currency: "EGP",
          merchant_order_id: merchantOrderId,
          paymob_order_id: String(orderId),
          created_by: user.id,
        })
        .select("id")
        .single();
    const { data: checkout, error: checkoutError } = checkoutResult;
    if (checkoutError || !checkout) throw new Error("Checkout session could not be saved");

    const paymentKey = await getPaymentKey(authToken, orderId, amountCents, integrationId, billingData);
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(paymentKey)}`;

    return new Response(JSON.stringify({
      success: true,
      iframe_url: iframeUrl,
      order_id: orderId,
      checkout_id: checkout.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Subscription checkout failed:", (error as Error).message);
    return new Response(JSON.stringify({ error: "فشل في بدء عملية الدفع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
