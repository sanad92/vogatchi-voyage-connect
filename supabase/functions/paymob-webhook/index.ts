import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order.id", "owner", "pending", "source_data.pan",
  "source_data.sub_type", "source_data.type", "success",
];

type TransactionStatus = "success" | "voided" | "refunded" | "pending" | "failed";

function getNestedValue(value: Record<string, unknown>, path: string): string {
  let current: unknown = value;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return String(current ?? "");
}

async function verifyHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  hmacSecret: string,
): Promise<boolean> {
  if (!/^[0-9a-f]{128}$/i.test(receivedHmac)) return false;
  const concatenated = HMAC_FIELDS.map((field) => getNestedValue(payload, field)).join("");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hmacSecret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(concatenated));
  return encodeHex(new Uint8Array(signature)) === receivedHmac.toLowerCase();
}

function parseTransactionStatus(transaction: Record<string, any>): {
  status: TransactionStatus;
  errorMessage: string | null;
} {
  if (transaction.success === true && transaction.is_voided === false && transaction.is_refunded === false) {
    return { status: "success", errorMessage: null };
  }
  if (transaction.is_voided === true) {
    return { status: "voided", errorMessage: "Transaction was voided" };
  }
  if (transaction.is_refunded === true) {
    return { status: "refunded", errorMessage: "Transaction was refunded" };
  }
  if (transaction.pending === true) return { status: "pending", errorMessage: null };
  return {
    status: "failed",
    errorMessage: transaction.data?.message ||
      `Transaction failed (code: ${transaction.txn_response_code || "unknown"})`,
  };
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
    const hmacSecret = Deno.env.get("PAYMOB_HMAC");
    if (!hmacSecret) {
      console.error("PAYMOB_HMAC is not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const transaction = body?.obj as Record<string, any> | undefined;
    if (!transaction?.id || !transaction?.order?.id) {
      return new Response(JSON.stringify({ error: "Invalid Paymob payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receivedHmac = new URL(request.url).searchParams.get("hmac") || "";
    const hmacValid = await verifyHmac(transaction, receivedHmac, hmacSecret);
    const { status, errorMessage } = parseTransactionStatus(transaction);
    const providerTransactionId = String(transaction.id);
    const paymobOrderId = String(transaction.order.id);
    const merchantOrderId = String(transaction.order.merchant_order_id || "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: checkout } = await admin
      .from("payment_checkout_sessions")
      .select("*")
      .eq("merchant_order_id", merchantOrderId)
      .maybeSingle();

    const amountCents = Number(transaction.amount_cents || 0);
    const currency = String(transaction.currency || "").toUpperCase();
    const checkoutValid = Boolean(
      checkout &&
      checkout.paymob_order_id === paymobOrderId &&
      Number(checkout.amount_cents) === amountCents &&
      checkout.currency === currency &&
      new Date(checkout.expires_at).getTime() >= Date.now()
    );
    const storedStatus = !hmacValid
      ? "invalid_hmac"
      : !checkoutValid
      ? "invalid_checkout"
      : status;
    const storedError = !hmacValid
      ? "Paymob HMAC verification failed"
      : !checkoutValid
      ? "Transaction does not match a live server checkout session"
      : errorMessage;

    const { error: transactionError } = await admin
      .from("payment_transactions")
      .upsert({
        organization_id: checkout?.organization_id || null,
        checkout_session_id: checkout?.id || null,
        plan_id: checkout?.plan_id || null,
        billing_cycle: checkout?.billing_cycle || null,
        expected_amount_cents: checkout ? Number(checkout.amount_cents) : null,
        paymob_order_id: paymobOrderId,
        paymob_transaction_id: providerTransactionId,
        amount_cents: amountCents,
        currency: currency || "EGP",
        status: storedStatus,
        payment_method: transaction.source_data?.type || null,
        card_last_four: transaction.source_data?.pan || null,
        card_brand: transaction.source_data?.sub_type || null,
        billing_name: `${transaction.billing_data?.first_name || ""} ${transaction.billing_data?.last_name || ""}`.trim() || null,
        billing_email: transaction.billing_data?.email || null,
        billing_phone: transaction.billing_data?.phone_number || null,
        error_message: storedError,
        raw_payload: body,
        hmac_valid: hmacValid,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "paymob_transaction_id" });
    if (transactionError) throw transactionError;

    if (checkout && hmacValid && checkoutValid) {
      const checkoutStatus = status === "success" ? "pending" : status;
      await admin
        .from("payment_checkout_sessions")
        .update({
          status: checkoutStatus,
          provider_transaction_id: providerTransactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkout.id);
    }

    let activated = false;
    if (status === "success" && hmacValid && checkoutValid) {
      const { data, error } = await admin.rpc("activate_subscription_from_paymob", {
        _paymob_transaction_id: providerTransactionId,
      });
      if (error) throw error;
      activated = data === true;
    }

    console.log(
      `Paymob webhook processed: txn=${providerTransactionId}, status=${storedStatus}, activated=${activated}`,
    );
    return new Response(JSON.stringify({
      received: true,
      hmac_valid: hmacValid,
      checkout_valid: checkoutValid,
      status: storedStatus,
      activated,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Paymob webhook failed:", (error as Error).message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
