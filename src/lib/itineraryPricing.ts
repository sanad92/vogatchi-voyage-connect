export type PricingLine = { cost: number; quantity: number; exchangeRate: number; markupType: 'percent' | 'fixed' | 'manual'; markup: number };
export const moneyRound = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Match create_quote_atomic: the server rounds unit price * quantity to 2 decimals. */
export function priceItineraryLine(line: PricingLine) {
  const { quantity, markupType, markup } = line;
  const rawUnitCost = line.cost * line.exchangeRate;
  const rawCost = rawUnitCost * quantity;
  const targetSale = markupType === 'manual' ? markup : markupType === 'fixed' ? rawCost + markup : rawCost * (1 + markup / 100);
  // Keep extra unit precision; the DB stores numeric and rounds the line total.
  const costPrice = Number(rawUnitCost.toFixed(8));
  const sellingPrice = Number((targetSale / quantity).toFixed(8));
  return {
    costPrice,
    sellingPrice,
    totalCost: moneyRound(costPrice * quantity),
    totalSale: moneyRound(sellingPrice * quantity),
  };
}
