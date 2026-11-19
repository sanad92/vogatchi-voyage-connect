import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { flashTestCallbackStatus, FLASH_TEST_REFERENCE_PREFIX, isFlashTestBackend, type FlashTestCallback } from "../_shared/paymob-flash-test.ts";
import { verifyPaymobHmac } from "../_shared/paymob-signature.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secret = Deno.env.get("PAYMOB_FLASH_TEST_HMAC");
  const organizationId = Deno.env.get("PAYMOB_FLASH_TEST_ORGANIZATION_ID");
  if (!isFlashTestBackend(supabaseUrl) || Deno.env.get("PAYMOB_FLASH_TEST_ENABLED") !== "true" || !secret || !organizationId) {
    return Response.json({ error: "Test webhook unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (body?.type === "TOKEN") return Response.json({ received: true });
    const transaction = body?.obj;
    const reference = transaction?.order?.merchant_order_id;
    if (typeof reference !== "string" || !reference.startsWith(FLASH_TEST_REFERENCE_PREFIX)) {
      return Response.json({ error: "Invalid test transaction reference" }, { status: 400 });
    }
    const hmac = new URL(request.url).searchParams.get("hmac") ?? "";
    if (!await verifyPaymobHmac(transaction, hmac, secret)) {
      return Response.json({ error: "Invalid test transaction signature" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: checkout, error } = await admin.from("payment_checkout_sessions")
      .select("id,status,merchant_order_id,paymob_order_id,amount_cents,currency,expires_at")
      .eq("merchant_order_id", reference).eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    const status = checkout && flashTestCallbackStatus(transaction as FlashTestCallback, checkout);
    if (!status) return Response.json({ error: "Test transaction does not match the checkout" }, { status: 400 });
    if (status !== "pending" && checkout.status !== "paid") {
      const { error: updateError } = await admin.from("payment_checkout_sessions")
        .update({ status, provider_transaction_id: String(transaction.id), updated_at: new Date().toISOString() })
        .eq("id", checkout.id).eq("organization_id", organizationId).in("status", ["pending", "failed"]);
      if (updateError) throw updateError;
    }

    return Response.json({ received: true, test: true });
  } catch {
    console.error("Paymob Flash test webhook failed");
    return Response.json({ error: "Could not process test transaction" }, { status: 500 });
  }
});
