import type { IncomeStatementV2Row } from '@/hooks/useFinancialReports';

export const expenseSectionLabels = {
  operating_expense: 'مصروفات التشغيل',
  cost_of_sales: 'تكلفة الخدمات',
};

export function summarizeExpenseLedger(rows: IncomeStatementV2Row[], currency: string) {
  const accounts = rows
    .filter(row => row.section === 'operating_expense' || row.section === 'cost_of_sales')
    .map(row => {
      const amount = Number(row.amount);
      // Fail visibly if the report contract breaks; never disguise a missing
      // amount as zero or silently combine currencies.
      if (row.currency !== currency || row.amount == null || String(row.amount).trim() === '' || !Number.isFinite(amount)) {
        throw new Error('Invalid expense report data');
      }
      return { ...row, amount, name: row.account_name_ar || row.account_name };
    });
  const operatingTotal = accounts.filter(row => row.section === 'operating_expense').reduce((sum, row) => sum + row.amount, 0);
  const costOfSalesTotal = accounts.filter(row => row.section === 'cost_of_sales').reduce((sum, row) => sum + row.amount, 0);
  return { accounts, operatingTotal, costOfSalesTotal, total: operatingTotal + costOfSalesTotal };
}
