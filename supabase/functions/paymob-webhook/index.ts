import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fields used by Paymob HMAC calculation (alphabetical order)
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

function getNestedValue(obj: any, path: string): string {
  const parts = path.split(".");
  let value = obj;
  for (const part of parts) {
    if (value == null) return "";
    value = value[part];
  }
  return String(value ?? "");
}

async function verifyHmac(payload: any, receivedHmac: string, hmacSecret: string): Promise<boolean> {
  const concatenated = HMAC_FIELDS.map((field) =>
    getNestedValue(payload, field)
  ).join("");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hmacSecret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(concatenated));
  const calculatedHmac = encodeHex(new Uint8Array(signature));

  return calculatedHmac === receivedHmac;
}

function parseTransactionStatus(txn: any): {
  status: string;
  errorMessage: string | null;
} {
  if (txn.success === true && txn.is_voided === false && txn.is_refunded === false) {
    return { status: "success", errorMessage: null };
  }
  if (txn.is_voided === true) {
    return { status: "voided", errorMessage: "Transaction was voided" };
  }
  if (txn.is_refunded === true) {
    return { status: "refunded", errorMessage: "Transaction was refunded" };
  }
  if (txn.pending === true) {
    return { status: "pending", errorMessage: null };
  }

  // Failed
  const errorMsg =
    txn.data?.message ||
    txn.error_occured
      ? `Transaction failed (txn_response_code: ${txn.txn_response_code || "unknown"})`
      : "Unknown payment error";
  return { status: "failed", errorMessage: errorMsg };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const hmacSecret = Deno.env.get("PAYMOB_HMAC");
    if (!hmacSecret) {
      console.error("PAYMOB_HMAC secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const body = await req.json();
    const txn = body.obj;
    if (!txn) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing obj" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get HMAC from query params (Paymob sends it as ?hmac=...)
    const url = new URL(req.url);
    const receivedHmac = url.searchParams.get("hmac") || "";

    // Verify HMAC
    const hmacValid = await verifyHmac(txn, receivedHmac, hmacSecret);
    if (!hmacValid) {
      console.error("HMAC verification failed for transaction:", txn.id);
    }

    // Parse status
    const { status, errorMessage } = parseTransactionStatus(txn);

    // Create admin Supabase client (service role for writing)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract merchant_order_id to find organization
    const merchantOrderId = txn.order?.merchant_order_id || null;
    let organizationId: string | null = null;

    // merchant_order_id format: org_{orgId}_sub_{subId} or similar
    if (merchantOrderId && merchantOrderId.startsWith("org_")) {
      const parts = merchantOrderId.split("_");
      if (parts.length >= 2) {
        organizationId = parts[1];
      }
    }

    // Log the payment transaction
    const { error: insertError } = await supabase
      .from("payment_transactions")
      .insert({
        organization_id: organizationId,
        paymob_order_id: String(txn.order?.id || ""),
        paymob_transaction_id: String(txn.id || ""),
        amount_cents: txn.amount_cents || 0,
        currency: txn.currency || "EGP",
        status,
        payment_method: txn.source_data?.type || null,
        card_last_four: txn.source_data?.pan || null,
        card_brand: txn.source_data?.sub_type || null,
        billing_name: `${txn.billing_data?.first_name || ""} ${txn.billing_data?.last_name || ""}`.trim() || null,
        billing_email: txn.billing_data?.email || null,
        billing_phone: txn.billing_data?.phone_number || null,
        error_message: errorMessage,
        raw_payload: body,
        hmac_valid: hmacValid,
        processed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to log payment transaction:", insertError);
    }

    // If HMAC is invalid, log but don't process further
    if (!hmacValid) {
      console.warn("Skipping subscription update due to invalid HMAC");
      return new Response(
        JSON.stringify({ received: true, hmac_valid: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update subscription if payment succeeded and we have an org
    if (status === "success" && organizationId) {
      // Activate subscription / extend expiry
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status, expires_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (currentSub) {
        // Extend by 30 days from now or from current expiry (whichever is later)
        const currentExpiry = currentSub.expires_at ? new Date(currentSub.expires_at) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 30);

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: newExpiry.toISOString(),
            payment_method: "paymob",
            payment_reference: String(txn.id),
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSub.id);

        console.log(`Subscription ${currentSub.id} activated until ${newExpiry.toISOString()}`);
      }
    }

    // Handle failed payments - log warning
    if (status === "failed" && organizationId) {
      console.warn(`Payment failed for org ${organizationId}: ${errorMessage}`);
    }

    console.log(`Webhook processed: txn=${txn.id}, status=${status}, hmac=${hmacValid}`);

    return new Response(
      JSON.stringify({
        received: true,
        hmac_valid: hmacValid,
        status,
        transaction_id: txn.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
