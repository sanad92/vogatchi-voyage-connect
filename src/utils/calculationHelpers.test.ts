import { describe, expect, it } from 'vitest';
import { calculateFinancialBreakdown } from './calculationHelpers';

describe('calculateFinancialBreakdown', () => {
  it('applies discount and VAT consistently', () => {
    const breakdown = calculateFinancialBreakdown({
      subtotal: 100,
      discountAmount: 10,
      vatRate: 14,
      paidAmount: 40,
    });

    expect(breakdown.subtotal).toBe(100);
    expect(breakdown.discountAmount).toBe(10);
    expect(breakdown.discountedAmount).toBe(90);
    expect(breakdown.vatAmount).toBe(12.6);
    expect(breakdown.totalAmount).toBe(102.6);
    expect(breakdown.remainingAmount).toBe(62.6);
    expect(breakdown.paymentPercentage).toBe(38.98);
  });

  it('calculates profit from total amount minus cost', () => {
    const breakdown = calculateFinancialBreakdown({
      subtotal: 200,
      discountAmount: 20,
      vatRate: 10,
      totalCost: 150,
    });

    expect(breakdown.totalProfit).toBe(20);
  });
});
