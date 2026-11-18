const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order.id", "owner", "pending", "source_data.pan",
  "source_data.sub_type", "source_data.type", "success",
];

function getNestedValue(value: Record<string, unknown>, path: string): string {
  let current: unknown = value;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return String(current ?? "");
}

export async function verifyPaymobHmac(
  transaction: Record<string, unknown>,
  hmac: string,
  secret: string,
): Promise<boolean> {
  if (!/^[0-9a-f]{128}$/i.test(hmac)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["verify"],
  );
  const signature = Uint8Array.from(hmac.match(/../g)!, (hex) => parseInt(hex, 16));
  const input = HMAC_FIELDS.map((field) => getNestedValue(transaction, field)).join("");
  return await crypto.subtle.verify("HMAC", key, signature, encoder.encode(input));
}
