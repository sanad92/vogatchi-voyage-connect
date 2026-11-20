const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const providerId = /^[0-9]{1,32}$/;
const returnWindow = 2 * 60 * 60 * 1000;

type CheckoutReferences = {
  _checkout_id?: string;
  _order_id?: string;
  _transaction_id?: string;
};
type StoredCheckout = { checkoutId: string; orderId: string; savedAt: number };

function storageKey(userId: string, organizationId: string) {
  return `subscription-checkout-return:${userId}:${organizationId}`;
}

export function rememberSubscriptionCheckout(
  userId: string,
  organizationId: string,
  checkoutId: string,
  orderId: string,
) {
  if (!uuid.test(checkoutId) || !providerId.test(orderId)) return;
  try {
    sessionStorage.setItem(storageKey(userId, organizationId),
      JSON.stringify({ checkoutId, orderId, savedAt: Date.now() }));
  } catch {
    // Paymob can still return order or transaction identifiers.
  }
}

function storedCheckout(userId: string, organizationId: string): StoredCheckout | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey(userId, organizationId)) ?? 'null');
    if (data && typeof data.checkoutId === 'string' && uuid.test(data.checkoutId) &&
      typeof data.orderId === 'string' && providerId.test(data.orderId) &&
      typeof data.savedAt === 'number' && Date.now() - data.savedAt >= 0 &&
      Date.now() - data.savedAt < returnWindow) return data;
  } catch {
    // Corrupt or unavailable browser storage is optional.
  }
  return null;
}

function readIdentifier(params: URLSearchParams, names: string[], valid: RegExp): string | null | undefined {
  const values = names.flatMap((name) => params.getAll(name).map((value) => value.toLowerCase()));
  if (!values.length) return undefined;
  return valid.test(values[0]) && values.every((value) => value === values[0]) ? values[0] : null;
}

export function getSubscriptionCheckoutReferences(
  params: URLSearchParams,
  userId: string,
  organizationId: string,
): CheckoutReferences | null {
  const checkout = readIdentifier(params, ['checkout_id', 'checkout_session_id'], uuid);
  const order = readIdentifier(params, ['order', 'order_id'], providerId);
  const transaction = readIdentifier(params, ['id', 'transaction_id'], providerId);
  if (checkout === null || order === null || transaction === null) return null;
  if (checkout || order || transaction) {
    return { _checkout_id: checkout, _order_id: order, _transaction_id: transaction };
  }

  const stored = storedCheckout(userId, organizationId);
  return stored ? { _checkout_id: stored.checkoutId, _order_id: stored.orderId } : null;
}
