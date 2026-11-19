import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "X-Safar-Checkout-Discounts": "1",
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

const PAYMOB_CARD_INTEGRATION_FALLBACK = 6017673;

async function createIntention(
  secretKey: string,
  amountCents: number,
  specialReference: string,
  itemName: string,
  integrationIds: number[],
  billingData: BillingData,
  expirationSeconds: number,
): Promise<{ clientSecret: string; orderId: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const siteUrl = Deno.env.get("SITE_URL") || "https://safarerp.com";
  const response = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${secretKey}` },
    body: JSON.stringify({
      amount: amountCents,
      currency: "EGP",
      payment_methods: integrationIds,
      items: [{ name: itemName.slice(0, 50), amount: amountCents, description: itemName.slice(0, 255), quantity: 1 }],
      billing_data: {
        first_name: sanitizeString(billingData.first_name) || "N/A",
        last_name: sanitizeString(billingData.last_name) || "N/A",
        email: sanitizeString(billingData.email, 255),
        phone_number: sanitizeString(billingData.phone_number, 20) || "+201000000000",
        city: sanitizeString(billingData.city) || "Cairo",
        country: "EG",
        street: "N/A",
        building: "N/A",
        floor: "N/A",
        apartment: "N/A",
        state: "N/A",
      },
      special_reference: specialReference,
      expiration: expirationSeconds,
      notification_url: `${supabaseUrl}/functions/v1/paymob-webhook`,
      redirection_url: `${siteUrl}/payment-success`,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("Paymob intention failed", response.status, text.slice(0, 500));
    throw new Error("Paymob intention creation failed");
  }
  const data = JSON.parse(text);
  const orderId = Number(data.intention_order_id);
  if (!data.client_secret || !Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new Error("Invalid Paymob intention response");
  }
  return { clientSecret: data.client_secret, orderId };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method === "GET") return Response.json({ discounts: true }, { headers: corsHeaders });
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
    const planAmountCents = Math.round(price * 100);
    if (!Number.isSafeInteger(planAmountCents) || planAmountCents < 100) {
      throw new Error("Invalid server-side subscription price");
    }

    const secretKey = Deno.env.get("PAYMOB_SECRET_KEY");
    const publicKey = Deno.env.get("PAYMOB_PUBLIC_KEY");
    const integrationIds = [
      Deno.env.get("PAYMOB_INTEGRATION_ID"),
      Deno.env.get("PAYMOB_WALLET_INTEGRATION_ID"),
    ].map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
    if (integrationIds.length === 0) integrationIds.push(PAYMOB_CARD_INTEGRATION_FALLBACK);
    if (!secretKey || !publicKey) {
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
        .eq("created_by", user.id)
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
    const amountCents = preparedCheckout ? Number(preparedCheckout.amount_cents) : planAmountCents;
    if (!Number.isSafeInteger(amountCents) || amountCents < 100) {
      throw new Error("Invalid prepared checkout amount");
    }

    const attempt = crypto.randomUUID().slice(0, 8);
    // Paymob requires a unique special_reference per intention, so retries get a fresh reference.
    const merchantOrderId = preparedCheckout && !preparedCheckout.paymob_order_id
      ? preparedCheckout.merchant_order_id
      : `org_${body.organization_id}_plan_${plan.id}_${body.billing_cycle}_${attempt}`;
    const itemName = `SafarERP ${plan.name_ar || plan.name} - ${body.billing_cycle === "yearly" ? "yearly" : "monthly"}`;

    const expirationSeconds = preparedCheckout
      ? Math.min(3600, Math.floor((Date.parse(preparedCheckout.expires_at) - Date.now()) / 1000))
      : 3600;
    if (expirationSeconds < 1) throw new Error("Checkout expired");

    const { clientSecret, orderId } = await createIntention(
      secretKey, amountCents, merchantOrderId, itemName, integrationIds, billingData, expirationSeconds,
    );

    const checkoutResult = preparedCheckout
      ? await admin
        .from("payment_checkout_sessions")
        .update({
          paymob_order_id: String(orderId),
          merchant_order_id: merchantOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", preparedCheckout.id)
        .eq("status", "pending")
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
    if (checkoutError || !checkout) {
      console.error("Checkout session save failed", checkoutError);
      throw new Error("Checkout session could not be saved");
    }

    const iframeUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;

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
