export const FLASH_TEST_REFERENCE_PREFIX = "paymob_flash_test_";
export const FLASH_TEST_INTEGRATION_IDS = [6017673, 6066456] as const;
const INTENTION_URL = "https://accept.paymob.com/v1/intention/";
const HOSTED_CHECKOUT_URL = "https://eg.checkout.paymob.com/";

export const flashTestReference = (checkoutId: string) => FLASH_TEST_REFERENCE_PREFIX + checkoutId;

export interface FlashBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  country: string;
}

export interface FlashTestConfig {
  secretKey: string;
  publicKey: string;
  returnOrigin: string;
  supabaseUrl: string;
}

export function flashTestConfig(
  secretKey: string | undefined, publicKey: string | undefined,
  returnOrigin: string | undefined, supabaseUrl: string | undefined,
): FlashTestConfig | null {
  if (!secretKey || !/^(egy_)?sk_test_[a-zA-Z0-9]+$/.test(secretKey) ||
      !publicKey || !/^(egy_)?pk_test_[a-zA-Z0-9]+$/.test(publicKey) ||
      !returnOrigin || !supabaseUrl) return null;

  try {
    const url = new URL(returnOrigin);
    const backend = new URL(supabaseUrl);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || backend.protocol !== "https:" ||
        ["safarerp.com", "www.safarerp.com", "safarerp.lovable.app"].includes(host) ||
        url.pathname !== "/" || url.search || url.hash || url.username || url.password ||
        backend.username || backend.password) return null;
    return { secretKey, publicKey, returnOrigin: url.origin, supabaseUrl: backend.origin };
  } catch {
    return null;
  }
}

export async function createFlashTestIntention(
  config: FlashTestConfig,
  checkout: { id: string; amount: number; itemName: string; billing: FlashBillingData; expiresAt: string },
  request: typeof fetch = fetch,
): Promise<{ orderId: string; checkoutUrl: string }> {
  const expiration = Math.min(3600, Math.floor((Date.parse(checkout.expiresAt) - Date.now()) / 1000));
  if (!Number.isFinite(expiration) || expiration < 60) throw new Error("Test checkout expired");

  const redirect = new URL("/payment-success", config.returnOrigin);
  redirect.searchParams.set("paymob_mode", "flash_test");
  redirect.searchParams.set("checkout", checkout.id);

  const response = await request(INTENTION_URL, {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Token ${config.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: checkout.amount,
      currency: "EGP",
      payment_methods: FLASH_TEST_INTEGRATION_IDS,
      items: [{ name: checkout.itemName, amount: checkout.amount, description: checkout.itemName, quantity: 1 }],
      billing_data: {
        ...checkout.billing, street: "N/A", building: "N/A", apartment: "N/A", floor: "N/A", state: "Cairo",
      },
      special_reference: flashTestReference(checkout.id),
      expiration,
      notification_url: new URL("/functions/v1/paymob-flash-test-webhook", config.supabaseUrl).href,
      redirection_url: redirect.href,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Paymob test Intention failed (HTTP ${response.status})`);

  const { intention_order_id, client_secret } = await response.json();
  if (!/^[0-9]+$/.test(String(intention_order_id ?? "")) || !client_secret || typeof client_secret !== "string") {
    throw new Error("Paymob test response did not contain an order and checkout token");
  }

  const checkoutUrl = new URL(HOSTED_CHECKOUT_URL);
  checkoutUrl.searchParams.set("publicKey", config.publicKey);
  checkoutUrl.searchParams.set("clientSecret", client_secret);
  return { orderId: String(intention_order_id), checkoutUrl: checkoutUrl.href };
}

export interface FlashTestCallback {
  id?: string | number;
  order?: { id?: string | number; merchant_order_id?: string };
  integration_id?: string | number;
  amount_cents?: string | number;
  currency?: string;
  pending?: boolean;
  success?: boolean;
  error_occured?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_refunded?: boolean;
  is_voided?: boolean;
}

export function flashTestCallbackStatus(
  t: FlashTestCallback,
  checkout: { merchant_order_id: string; paymob_order_id: string | null; amount_cents: number | string; currency: string; expires_at: string },
): "paid" | "pending" | "failed" | null {
  const expires = Date.parse(checkout.expires_at);
  if (!/^[0-9]+$/.test(String(t.id ?? "")) || !checkout.paymob_order_id ||
      !checkout.merchant_order_id.startsWith(FLASH_TEST_REFERENCE_PREFIX) ||
      t.order?.merchant_order_id !== checkout.merchant_order_id || String(t.order?.id) !== checkout.paymob_order_id ||
      !FLASH_TEST_INTEGRATION_IDS.some((id) => id === Number(t.integration_id)) ||
      !Number.isSafeInteger(Number(t.amount_cents)) || Number(t.amount_cents) !== Number(checkout.amount_cents) ||
      t.currency !== checkout.currency || checkout.currency !== "EGP" || !Number.isFinite(expires) || expires < Date.now()) return null;
  if (t.is_voided === true || t.is_refunded === true) return null;
  if (t.pending === true) return "pending";
  if (t.success !== true || t.error_occured === true) return "failed";
  if (t.is_auth === true && t.is_capture !== true) return "pending";
  return "paid";
}
