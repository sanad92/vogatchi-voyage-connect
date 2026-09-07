import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";
import {
  useApproveSupplierPO,
  useRecordSupplierPayment,
  useTreasuryAccounts,
} from "@/hooks/finance/useFinanceRpcs";
import { useOrgId } from "@/hooks/useOrgId";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSupabasePermissions } from "@/hooks/useSupabasePermissions";
import { paymentOrderBalance, canPayOrder } from "@/lib/paymentOrderBalance";

type Order = {
  id: string;
  reference_number: string;
  amount: number;
  currency: string;
  due_date: string | null;
  status: string;
  approval_status: string;
  service_type: string;
  booking_id: string;
  supplier_id: string | null;
  rejection_reason: string | null;
  suppliers?: { name: string } | null;
  bookings?: { booking_number: string } | null;
  supplier_payment_allocations?: Array<{ amount: number }>;
  paidAmount: number;
  remainingAmount: number;
};
type TreasuryAccount = { id: string; account_name: string; currency: string };
const labels: Record<string, string> = {
  pending: "معلق",
  approved: "معتمد",
  rejected: "مرفوض",
  paid: "مدفوع",
  cancelled: "ملغي",
  partially_paid: "مدفوع جزئيًا",
};

export default function PaymentOrders() {
  usePageTitle("أوامر دفع الموردين");
  const orgId = useOrgId();
  const { canProcessPayments } = useSupabasePermissions();
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("all"),
    [search, setSearch] = useState(""),
    [accounts, setAccounts] = useState<Record<string, string>>({});
  const { data: treasuryData = [] } = useTreasuryAccounts();
  const treasury = treasuryData as TreasuryAccount[];
  const approve = useApproveSupplierPO();
  const pay = useRecordSupplierPayment();
  const query = useQuery({
    queryKey: ["supplier-payment-orders-all", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_payment_orders")
        .select("*, suppliers(name), bookings(booking_number), supplier_payment_allocations(amount)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(order => ({ ...order, ...paymentOrderBalance(order.amount, order.supplier_payment_allocations) })) as unknown as Order[];
    },
  });
  const rows = useMemo(
    () =>
      (query.data || []).filter(
        (r) =>
          (status === "all" ||
            r.status === status ||
            r.approval_status === status) &&
          (!search ||
            r.reference_number.toLowerCase().includes(search.toLowerCase()) ||
            r.suppliers?.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.bookings?.booking_number
              ?.toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [query.data, status, search],
  );
  const totals = useMemo(
    () => ({
      all: query.data?.length || 0,
      pending: (query.data || []).filter((r) => r.approval_status === "pending")
        .length,
      approved: (query.data || []).filter(
        (r) => canPayOrder(r),
      ).length,
      paid: (query.data || []).filter((r) => r.status === "paid").length,
    }),
    [query.data],
  );
  return (
    <div className="space-y-5 p-4 md:p-6" dir="rtl">
      <PageHeader
        icon={CreditCard}
        title="أوامر دفع الموردين"
        description="دورة واحدة من إنشاء الاستحقاق إلى الاعتماد ثم الصرف من الخزينة."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Count label="الإجمالي" value={totals.all} />
        <Count label="بانتظار الاعتماد" value={totals.pending} />
        <Count label="جاهز للصرف" value={totals.approved} />
        <Count label="تم صرفه" value={totals.paid} />
      </div>
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="رقم الأمر أو الحجز أو المورد"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">بانتظار الاعتماد</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
              <SelectItem value="partially_paid">مدفوع جزئيًا</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {query.isLoading && (
        <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل أوامر الدفع...
        </div>
      )}
      {query.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تعذر تحميل الأوامر</AlertTitle>
          <AlertDescription>
            {query.error instanceof Error
              ? query.error.message
              : "حدث خطأ غير متوقع."}
          </AlertDescription>
        </Alert>
      )}
      {!query.isLoading && !query.error && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الأمر</TableHead>
                    <TableHead>الحجز</TableHead>
                    <TableHead>المورد</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الاستحقاق</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {r.reference_number}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="link" className="h-auto p-0">
                          <Link
                            to={`/bookings/${r.booking_id}/workspace?tab=financials`}
                          >
                            {r.bookings?.booking_number || "فتح الحجز"}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell>{r.suppliers?.name || "غير محدد"}</TableCell>
                      <TableCell>
                        {Number(r.amount).toLocaleString("ar-EG")} {r.currency}
                      </TableCell>
                      <TableCell>{r.due_date || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "paid"
                              ? "default"
                              : r.approval_status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {labels[r.status] ||
                            labels[r.approval_status] ||
                            r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-64 items-center gap-2">
                          {canProcessPayments() && r.approval_status === "pending" && r.status !== "cancelled" && (
                            <>
                              <Button
                                size="sm"
                                disabled={approve.isPending}
                                onClick={() =>
                                  approve.mutate({ po_id: r.id, approve: true })
                                }
                              >
                                اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={approve.isPending}
                                onClick={() =>
                                  approve.mutate({
                                    po_id: r.id,
                                    approve: false,
                                  })
                                }
                              >
                                رفض
                              </Button>
                            </>
                          )}
                          {canProcessPayments() && canPayOrder(r) && (
                              <>
                                <Select
                                  value={accounts[r.id]}
                                  onValueChange={(v) =>
                                    setAccounts((p) => ({ ...p, [r.id]: v }))
                                  }
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue placeholder="اختر الخزينة" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {treasury
                                      .filter(
                                        (account) => account.currency === r.currency,
                                      )
                                      .map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                          {account.account_name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {r.currency !== 'EGP' && <Input
                                  type="number" min="0.000001" step="any"
                                  aria-label={`سعر صرف ${r.currency} إلى EGP للأمر ${r.reference_number}`}
                                  placeholder="سعر الصرف إلى EGP"
                                  value={exchangeRates[r.id] || ''}
                                  onChange={event => setExchangeRates(previous => ({ ...previous, [r.id]: event.target.value }))}
                                />}
                                <Button
                                  size="sm"
                                  disabled={!accounts[r.id] || pay.isPending || (r.currency !== 'EGP' && !(Number(exchangeRates[r.id]) > 0 && Number.isFinite(Number(exchangeRates[r.id]))))}
                                  onClick={() =>
                                    pay.mutate({
                                      po_id: r.id,
                                      amount: r.remainingAmount,
                                      currency: r.currency,
                                      exchange_rate: r.currency === 'EGP' ? 1 : Number(exchangeRates[r.id]),
                                      treasury_account_id: accounts[r.id],
                                      payment_date: new Date()
                                        .toISOString()
                                        .slice(0, 10),
                                    })
                                  }
                                >
                                صرف المتبقي ({r.remainingAmount.toLocaleString('ar-EG')} {r.currency})
                                </Button>
                              </>
                            )}
                          {r.status === "paid" && (
                            <span className="text-sm text-emerald-600">
                              مكتمل
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        لا توجد أوامر مطابقة.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
const Count = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="pt-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);
