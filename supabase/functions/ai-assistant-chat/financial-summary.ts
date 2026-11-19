type FinancialRow = {
  currency: string | null;
  selling_price?: number | null;
  cost_price?: number | null;
  amount?: number;
  final_amount?: number | null;
  total_paid_amount?: number | null;
};

type Query = {
  order: (column: string) => {
    range: (start: number, end: number) => PromiseLike<{
      data: FinancialRow[] | null;
      error: unknown;
    }>;
  };
};

const PAGE_SIZE = 500;

async function readRows(query: Query, source: string) {
  const rows: FinancialRow[] = [];
  const ordered = query.order("id");
  for (let first = 0; ; first += PAGE_SIZE) {
    const { data, error } = await ordered.range(first, first + PAGE_SIZE - 1);
    if (error || !data) {
      console.error("AI financial summary query failed", source, error);
      return { source, rows: null };
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { source, rows };
  }
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function getFinancialSummary(supabase: any, orgId: string, from: unknown, to: unknown) {
  if (!validDate(from) || !validDate(to) || from > to) {
    return { error: "فترة الملخص المالي غير صالحة." };
  }

  const nextDay = new Date(to);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const fromTable = (table: string, columns: string) =>
    supabase.from(table).select(columns).eq("organization_id", orgId);
  const reads = await Promise.all([
    readRows(fromTable("bookings", "currency, selling_price, cost_price")
      .gte("created_at", from).lt("created_at", nextDay.toISOString()), "الحجوزات"),
    readRows(fromTable("customer_payments", "currency, amount").eq("status", "completed")
      .gte("payment_date", from).lte("payment_date", to), "التحصيل من العملاء"),
    readRows(fromTable("supplier_payments", "currency, amount").in("status", ["paid", "completed"])
      .gte("payment_date", from).lte("payment_date", to), "مدفوعات الموردين"),
    readRows(fromTable("expense_transactions", "currency, amount").in("status", ["approved", "paid"])
      .gte("transaction_date", from).lte("transaction_date", to), "المصروفات المعتمدة أو المسددة"),
    readRows(fromTable("invoices", "currency, final_amount, total_paid_amount")
      .not("status", "in", "(draft,cancelled,canceled,void,voided)"), "الفواتير"),
  ]);

  const failed = reads.filter((read) => read.rows === null);
  if (failed.length) return { error: "تعذر إعداد الملخص المالي.", unavailable: failed.map((read) => read.source) };
  if (reads.some((read) => read.rows!.some((row) => !row.currency?.trim()))) {
    return { error: "تعذر إعداد الملخص المالي لوجود سجلات مالية بدون عملة." };
  }

  const emptyTotals = () => ({
    booking_value: 0,
    supplier_cost: 0,
    collected_from_customers: 0,
    paid_to_suppliers: 0,
    recognized_expenses: 0,
    current_outstanding_receivables: 0,
  });
  const totals = new Map<string, ReturnType<typeof emptyTotals>>();
  const forCurrency = (row: FinancialRow) => {
    const currency = row.currency!.trim().toUpperCase();
    const total = totals.get(currency) ?? emptyTotals();
    totals.set(currency, total);
    return total;
  };
  const [bookings, customerPayments, supplierPayments, expenses, invoices] = reads.map((read) => read.rows!);
  for (const row of bookings) {
    const total = forCurrency(row);
    total.booking_value += Number(row.selling_price ?? 0);
    total.supplier_cost += Number(row.cost_price ?? 0);
  }
  for (const row of customerPayments) forCurrency(row).collected_from_customers += Number(row.amount);
  for (const row of supplierPayments) forCurrency(row).paid_to_suppliers += Number(row.amount);
  for (const row of expenses) forCurrency(row).recognized_expenses += Number(row.amount);
  for (const row of invoices) {
    forCurrency(row).current_outstanding_receivables += Math.max(
      0, Number(row.final_amount ?? 0) - Number(row.total_paid_amount ?? 0),
    );
  }

  return {
    period: { from, to },
    bookings_count: bookings.length,
    by_currency: Array.from(totals, ([currency, total]) => ({
      currency,
      ...total,
      estimated_booking_margin: total.booking_value - total.supplier_cost,
    })),
  };
}
