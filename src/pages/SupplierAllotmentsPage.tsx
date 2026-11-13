import { useState } from "react";
import { useSupplierAllotments, type SupplierAllotment } from "@/hooks/useSupplierAllotments";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Boxes } from "lucide-react";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";
import { useOrgId } from "@/hooks/useOrgId";

const SERVICE_TYPES = [
  { value: "hotel", label: "فندق" },
  { value: "flight", label: "طيران" },
  { value: "transport", label: "نقل" },
  { value: "car_rental", label: "تأجير سيارات" },
  { value: "tour", label: "باقة سياحية" },
];

export default function SupplierAllotmentsPage() {
  const orgId = useOrgId();
  return <SupplierAllotments key={orgId ?? "no-company"} />;
}

function SupplierAllotments() {
  const { suppliers } = useSuppliers();
  const [filterSupplier, setFilterSupplier] = useState<string | undefined>();
  const [selectedAllotmentId, setSelectedAllotmentId] = useState<string>();
  const [bookingReference, setBookingReference] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { hasPermission } = usePermissionCheck();
  const canCreate = hasPermission("suppliers_create");
  const canEdit = hasPermission("suppliers_edit");
  const canReserve = canEdit && hasPermission("bookings_view");
  const { allotments, isLoading, isError, createAllotment, usage, usageLoading, usageError, manageUsage } =
    useSupplierAllotments(filterSupplier, selectedAllotmentId);
  const selectedAllotment = allotments.find((allotment) => allotment.id === selectedAllotmentId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SupplierAllotment>>({
    service_type: "hotel",
    currency: "EGP",
    status: "active",
    total_quantity: 0,
    used_quantity: 0,
    release_days: 7,
    cost_per_unit: 0,
  });

  const validForm = Boolean(
    form.supplier_id && form.allotment_name?.trim() && form.start_date && form.end_date &&
    form.start_date <= form.end_date && Number.isInteger(form.total_quantity) && (form.total_quantity ?? 0) > 0 &&
    Number.isInteger(form.release_days) && (form.release_days ?? -1) >= 0
  );

  const handleCreate = () => {
    if (!validForm) return;
    createAllotment.mutate(form, {
      onSuccess: () => {
        setOpen(false);
        setForm({ service_type: "hotel", currency: "EGP", status: "active", total_quantity: 0, used_quantity: 0, release_days: 7, cost_per_unit: 0 });
      },
    });
  };

  const showUsage = (id: string) => {
    setBookingReference("");
    setQuantity(1);
    setSelectedAllotmentId(id);
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "-";

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" />بلوكات المخزون (Allotments)</h1>
          <p className="text-muted-foreground">إدارة الكميات المحجوزة من الموردين</p>
        </div>
        {canCreate && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />بلوك جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>إضافة بلوك جديد</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>اسم البلوك *</Label>
                <Input value={form.allotment_name || ""} onChange={(e) => setForm({ ...form, allotment_name: e.target.value })} placeholder="غرف ديلوكس - صيف 2026" />
              </div>
              <div>
                <Label>المورد *</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع الخدمة *</Label>
                <Select value={form.service_type} onValueChange={(v: SupplierAllotment["service_type"]) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المرجع</Label>
                <Input value={form.service_reference || ""} onChange={(e) => setForm({ ...form, service_reference: e.target.value })} placeholder="نوع الغرفة" />
              </div>
              <div>
                <Label>مهلة الإفراج المتفق عليها (أيام)</Label>
                <Input type="number" min={0} value={form.release_days ?? 7} onChange={(e) => setForm({ ...form, release_days: +e.target.value })} />
              </div>
              <div>
                <Label>من تاريخ *</Label>
                <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>إلى تاريخ *</Label>
                <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div>
                <Label>الكمية الإجمالية *</Label>
                <Input type="number" min={1} value={form.total_quantity || 0} onChange={(e) => setForm({ ...form, total_quantity: +e.target.value })} />
              </div>
              <div>
                <Label>تكلفة الوحدة</Label>
                <Input type="number" value={form.cost_per_unit || 0} onChange={(e) => setForm({ ...form, cost_per_unit: +e.target.value })} />
              </div>
              <div>
                <Label>العملة</Label>
                <Input value={form.currency || "EGP"} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!validForm || createAllotment.isPending}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>

      <Card>
        <CardHeader><CardTitle>تصفية</CardTitle></CardHeader>
        <CardContent>
          <Select value={filterSupplier || "all"} onValueChange={(v) => setFilterSupplier(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-72"><SelectValue placeholder="كل الموردين" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الموردين</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>الفترة</TableHead>
                <TableHead>الاستهلاك</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">جارٍ التحميل...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={7} className="text-center">تعذر تحميل الحصص</TableCell></TableRow>
              ) : allotments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد بلوكات</TableCell></TableRow>
              ) : allotments.map((a) => {
                const pct = a.total_quantity > 0 ? (a.used_quantity / a.total_quantity) * 100 : 0;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.allotment_name}</TableCell>
                    <TableCell>{supplierName(a.supplier_id)}</TableCell>
                    <TableCell><Badge variant="outline">{SERVICE_TYPES.find((t) => t.value === a.service_type)?.label}</Badge></TableCell>
                    <TableCell className="text-xs">{a.start_date}<br />{a.end_date}</TableCell>
                    <TableCell className="min-w-32">
                      <div className="text-xs mb-1">{a.used_quantity} / {a.total_quantity}</div>
                      <Progress value={pct} className="h-2" />
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "active" ? "default" : "secondary"}>
                        {a.status === "active" ? "نشط" : a.status === "expired" ? "منتهي" : a.status === "released" ? "مُفرَج" : "ملغي"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => showUsage(a.id)}>الحركات</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedAllotment)} onOpenChange={(show) => { if (!show) setSelectedAllotmentId(undefined); }}>
        {selectedAllotment && (
          <DialogContent className="max-h-[90dvh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{selectedAllotment.allotment_name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              المستخدم {selectedAllotment.used_quantity} من {selectedAllotment.total_quantity}
              {selectedAllotment.status === "active" && `، المتاح ${selectedAllotment.total_quantity - selectedAllotment.used_quantity}`}
            </p>

            {canReserve && selectedAllotment.status === "active" && (
              <form className="space-y-3 rounded-md border p-3" onSubmit={(event) => {
                event.preventDefault();
                manageUsage.mutate({ id: selectedAllotment.id, action: "reserve", bookingReference, quantity }, {
                  onSuccess: () => { setBookingReference(""); setQuantity(1); },
                });
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="allotment-booking-reference">رقم الحجز</Label>
                    <Input id="allotment-booking-reference" required maxLength={120} value={bookingReference}
                      onChange={(event) => setBookingReference(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="allotment-booking-quantity">الكمية</Label>
                    <Input id="allotment-booking-quantity" required type="number" min={1} value={quantity || ""}
                      onChange={(event) => setQuantity(Number(event.target.value))} />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={manageUsage.isPending || !bookingReference.trim() || !Number.isInteger(quantity) || quantity < 1}>
                  تخصيص للحجز
                </Button>
              </form>
            )}

            <Table>
              <TableHeader><TableRow><TableHead>الحجز</TableHead><TableHead>التاريخ</TableHead><TableHead>الكمية</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
              <TableBody>
                {usage.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.booking_reference ?? entry.booking_id}</TableCell>
                    <TableCell>{entry.usage_date}</TableCell>
                    <TableCell>{entry.quantity_used}</TableCell>
                    <TableCell>
                      {entry.released_at ? "تم الإرجاع" : canEdit ? (
                        <Button variant="outline" size="sm" disabled={manageUsage.isPending}
                          onClick={() => manageUsage.mutate({ id: selectedAllotment.id, action: "release_usage", usageId: entry.id })}>
                          إرجاع الكمية
                        </Button>
                      ) : "مخصصة"}
                    </TableCell>
                  </TableRow>
                ))}
                {usage.length === 0 && <TableRow><TableCell colSpan={4}>
                  {usageLoading ? "جارٍ التحميل..." : usageError ? "تعذر تحميل الحركات" : "لا توجد حركات"}
                </TableCell></TableRow>}
              </TableBody>
            </Table>
            {canEdit && selectedAllotment.status === "active" && (
              <DialogFooter>
                <Button variant="outline" disabled={manageUsage.isPending} onClick={() => {
                  if (window.confirm("إغلاق الحصة يمنع التخصيصات الجديدة ويحفظ الحركات القائمة. هل تريد المتابعة؟")) {
                    manageUsage.mutate({ id: selectedAllotment.id, action: "release_allotment" });
                  }
                }}>إغلاق الحصة</Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
