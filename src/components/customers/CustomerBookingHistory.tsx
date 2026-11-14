import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plane, Car, Bus, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { bookingStatusLabel } from "@/lib/bookingStatus";
import { divideCurrencyTotals } from "@/lib/customerMetrics";
import { toast } from "sonner";

interface Props {
  customerId: string;
  bookings: Array<{
    id: string;
    booking_number: string | null;
    booking_type: string | null;
    created_at: string;
    status: string | null;
    selling_price: number | null;
    currency: string | null;
    start_date: string | null;
    end_date: string | null;
    supplier_name: string | null;
    notes: string | null;
  }>;
}

type BookingType = "hotel" | "flight" | "car_rental" | "transport";

const typeMeta: Record<BookingType, { label: string; icon: JSX.Element }> = {
  hotel: { label: "حجز فندق", icon: <Package className="h-4 w-4" /> },
  flight: { label: "حجز طيران", icon: <Plane className="h-4 w-4" /> },
  car_rental: { label: "تأجير سيارة", icon: <Car className="h-4 w-4" /> },
  transport: { label: "حجز نقل", icon: <Bus className="h-4 w-4" /> },
};

const CustomerBookingHistory = ({ customerId, bookings }: Props) => {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = bookings.map(booking => ({
    id: booking.id,
    type: (booking.booking_type ?? "hotel") as BookingType,
    reference: booking.booking_number ?? "—",
    created_at: booking.created_at,
    status: booking.status,
    total_amount: Number(booking.selling_price) || 0,
    currency: booking.currency?.trim().toUpperCase() || "EGP",
    start_date: booking.start_date,
    end_date: booking.end_date,
    supplier_name: booking.supplier_name,
    notes: booking.notes,
  })).filter(booking => activeTab === "all" || booking.type === activeTab);

  const totalsByCurrency: Record<string, number> = {};
  const countsByCurrency: Record<string, number> = {};
  for (const booking of filtered) {
    const currency = booking.currency;
    totalsByCurrency[currency] = (totalsByCurrency[currency] ?? 0) + booking.total_amount;
    countsByCurrency[currency] = (countsByCurrency[currency] ?? 0) + 1;
  }
  const averagesByCurrency = divideCurrencyTotals(totalsByCurrency, countsByCurrency);

  const exportBookingsData = () => {
    const exportData = {
      customer_id: customerId,
      bookings: filtered,
      export_date: new Date().toISOString(),
      total_bookings: filtered.length,
      totals_by_currency: totalsByCurrency,
    };
    const dataUri =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute(
      "download",
      `customer-bookings-${customerId}-${new Date().toISOString().split("T")[0]}.json`
    );
    link.click();
    toast.success("تم تصدير سجل الحجوزات بنجاح");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{filtered.length}</div>
            <div className="text-sm text-muted-foreground">عدد الحجوزات في السجل</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              {Object.keys(totalsByCurrency).length === 0 ? (
                <div className="text-2xl font-bold">0</div>
              ) : (
                Object.entries(totalsByCurrency).map(([cur, amt]) => (
                  <div key={cur} className="text-lg font-bold">
                    {amt.toLocaleString()} {cur}
                  </div>
                ))
              )}
            </div>
            <div className="text-sm text-muted-foreground">إجمالي قيمة الحجوزات في السجل</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              {Object.entries(averagesByCurrency).map(([currency, average]) => (
                <div key={currency} className="text-lg font-bold">
                  {average.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </div>
              ))}
              {filtered.length === 0 && <div className="text-2xl font-bold">0</div>}
            </div>
            <div className="text-sm text-muted-foreground">متوسط قيمة الحجز</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={exportBookingsData} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          تصدير البيانات
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">جميع الحجوزات</TabsTrigger>
          <TabsTrigger value="hotel">الفنادق</TabsTrigger>
          <TabsTrigger value="flight">الطيران</TabsTrigger>
          <TabsTrigger value="car_rental">السيارات</TabsTrigger>
          <TabsTrigger value="transport">النقل</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">لا توجد حجوزات من هذا النوع</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const meta = typeMeta[b.type] ?? typeMeta.hotel;
                return (
                  <Card key={b.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">{meta.icon}</div>
                          <div>
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {meta.label}
                              <Badge variant="outline">{b.reference}</Badge>
                            </div>
                            {b.supplier_name && (
                              <div className="text-sm text-muted-foreground mt-1">
                                المورد: {b.supplier_name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-semibold">
                            {b.total_amount.toLocaleString()} {b.currency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(b.created_at)}
                          </div>
                          <Badge variant="secondary" className="mt-1">
                            {bookingStatusLabel(b.status)}
                          </Badge>
                        </div>
                      </div>

                      {(b.start_date || b.end_date) && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                          {b.start_date && (
                            <div>
                              <span className="text-muted-foreground">من: </span>
                              {formatDate(b.start_date)}
                            </div>
                          )}
                          {b.end_date && (
                            <div>
                              <span className="text-muted-foreground">إلى: </span>
                              {formatDate(b.end_date)}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerBookingHistory;
