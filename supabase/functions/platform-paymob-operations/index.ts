import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMOB = "https://accept.paymob.com/api";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positiveId = /^[1-9][0-9]{0,19}$/;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Cache-Control": "no-store",
};
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { headers, status });

type Kind = "void" | "refund";
type PaymentAction = {
  kind: Kind;
  transaction_id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
};
type ProviderTransaction = {
  id?: number | string;
  parent_transaction?: number | string;
  order?: { id?: number | string };
  success?: boolean;
  pending?: boolean;
  error_occured?: boolean;
  has_parent_transaction?: boolean;
  is_refund?: boolean;
  is_void?: boolean;
  is_voided?: boolean;
  is_settled?: boolean;
  is_live?: boolean;
  amount_cents?: number;
  refunded_amount_cents?: number;
  currency?: string;
  source_data?: { type?: string };
};
type Status = "requested" | "submitted" | "succeeded" | "rejected" | "unknown";

function verifiedOutcome(transaction: ProviderTransaction, action: PaymentAction, live: boolean): Status {
  if (
    !positiveId.test(String(transaction.id)) || String(transaction.id) === action.transaction_id ||
    transaction.has_parent_transaction !== true || String(transaction.parent_transaction) !== action.transaction_id ||
    String(transaction.order?.id) !== action.order_id || transaction.currency !== action.currency ||
    Number(transaction.amount_cents) !== action.amount_cents || transaction.is_live !== live ||
    (action.kind === "void" ? transaction.is_void !== true : transaction.is_refund !== true)
  ) return "unknown";
  if (transaction.pending === true) return "submitted";
  if (transaction.pending !== false || typeof transaction.success !== "boolean") return "unknown";
  return transaction.success && transaction.error_occured !== true ? "succeeded" : "rejected";
}

async function providerRequest(path: string, init: RequestInit = {}) {
  return await fetch(PAYMOB + path, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
}

async function providerAuth(apiKey: string): Promise<string> {
  const response = await providerRequest("/auth/tokens", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: apiKey }),
  });
  if (!response.ok) throw new Error("Paymob inquiry authentication failed");
  const { token } = await response.json();
  if (typeof token !== "string" || !token) throw new Error("Paymob inquiry token missing");
  return token;
}

async function inquire(token: string, id: string): Promise<ProviderTransaction> {
  if (!positiveId.test(id)) throw new Error("Invalid Paymob transaction ID");
  const response = await providerRequest("/acceptance/transactions/" + id, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("Paymob transaction inquiry failed");
  return await response.json();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);
    const { data: role, error: roleError } = await client.rpc("get_platform_finance_role");
    if (roleError || !role) return json({ error: "forbidden" }, 403);

    const body = await request.json();
    if (!body || !["capabilities", "submit", "check"].includes(body.command)) return json({ error: "invalid" }, 400);
    const apiKey = Deno.env.get("PAYMOB_API_KEY");
    const secret = Deno.env.get("PAYMOB_OPERATIONS_SECRET_KEY") ?? Deno.env.get("PAYMOB_SECRET_KEY");
    const live = Deno.env.get("PAYMOB_OPERATIONS_MODE") !== "test";
    const configured = Boolean(apiKey && secret && new RegExp("^(egy_)?sk_" + (live ? "live" : "test") + "_[a-zA-Z0-9]+$").test(secret));
    if (body.command === "capabilities") return json({ configured, mode: live ? "live" : "test" });
    if (!configured) return json({ error: "not_configured" }, 503);
    if (!UUID.test(String(body.request_id))) return json({ error: "invalid" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const finish = async (status: Status, id?: string, httpStatus?: number) => {
      const { data, error } = await admin.rpc("finish_platform_paymob_action", {
        p_id: body.request_id, p_status: status, p_provider_action_id: id ?? null, p_http_status: httpStatus ?? null,
      });
      if (error) throw new Error("Could not save action result");
      return json({ status: data });
    };
    if (body.command === "check") {
      const { data, error } = await admin.rpc("get_platform_paymob_action", { p_id: body.request_id, p_actor: user.id });
      if (error || !data) return json({ error: "not_found" }, 404);
      if (["succeeded", "rejected"].includes(data.status)) return json({ status: data.status });
      const actionId = data.provider_action_id ?? String(body.provider_action_id ?? "");
      if (!positiveId.test(actionId)) return json({ status: data.status, needs_provider_id: true });
      const outcome = await inquire(await providerAuth(apiKey!), actionId);
      if (String(outcome.id) !== actionId) return json({ status: data.status, needs_provider_id: !data.provider_action_id });
      const status = verifiedOutcome(outcome, data, live);
      if (status === "unknown") return json({ status: data.status, needs_provider_id: !data.provider_action_id });
      return await finish(status, actionId);
    }

    const kind = body.kind as Kind;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!UUID.test(String(body.payment_id)) || (kind !== "void" && kind !== "refund") ||
        reason.length < 3 || reason.length > 300 ||
        (kind === "refund" && (!Number.isSafeInteger(body.amount_cents) || body.amount_cents <= 0))) {
      return json({ error: "invalid" }, 400);
    }
    const { data: reservation, error } = await admin.rpc("reserve_platform_paymob_action", {
      p_id: body.request_id, p_payment_id: body.payment_id, p_actor: user.id, p_kind: kind,
      p_amount_cents: kind === "refund" ? body.amount_cents : null, p_reason: reason,
    });
    if (error) return json({ error: error.code === "42501" ? "forbidden" : "not_eligible" }, error.code === "42501" ? 403 : 409);
    if (!reservation.send) return json({ status: reservation.status });

    const action: PaymentAction = { ...reservation, kind };
    let dispatched = false;
    try {
      const original = await inquire(await providerAuth(apiKey!), action.transaction_id);
      const refunded = original.refunded_amount_cents;
      if (
        String(original.id) !== action.transaction_id || String(original.order?.id) !== action.order_id ||
        Number(original.amount_cents) !== reservation.original_amount_cents || original.currency !== action.currency ||
        original.is_live !== live || original.success !== true || original.pending !== false ||
        original.is_voided !== false || original.has_parent_transaction !== false ||
        !Number.isSafeInteger(refunded) || refunded! < 0 ||
        refunded! + action.amount_cents > reservation.original_amount_cents ||
        (kind === "void" && (original.is_settled !== false || original.source_data?.type !== "card" || refunded !== 0))
      ) return await finish("rejected");

      dispatched = true;
      const provider = await providerRequest("/acceptance/void_refund/" + kind, {
        method: "POST",
        headers: { Authorization: "Token " + secret, "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: action.transaction_id, ...(kind === "refund" ? { amount_cents: action.amount_cents } : {}) }),
      });
      if (!provider.ok) return await finish([400, 401, 403, 404, 422].includes(provider.status) ? "rejected" : "unknown", undefined, provider.status);
      const result: ProviderTransaction = await provider.json();
      const outcome = verifiedOutcome(result, action, live);
      const resultId = outcome === "unknown" ? undefined : String(result.id);
      return await finish(outcome, resultId, provider.status);
    } catch {
      // A timeout or bad response after sending money must never trigger a second request.
      return await finish(dispatched ? "unknown" : "rejected");
    }
  } catch {
    return json({ error: "unavailable" }, 503);
  }
});
