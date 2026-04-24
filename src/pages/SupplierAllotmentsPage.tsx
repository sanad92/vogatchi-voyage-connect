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
import { Plus, Trash2, Boxes } from "lucide-react";
import { format } from "date-fns";

const SERVICE_TYPES = [
  { value: "hotel", label: "فندق" },
  { value: "flight", label: "طيران" },
  { value: "transport", label: "نقل" },
  { value: "car_rental", label: "تأجير سيارات" },
  { value: "tour", label: "باقة سياحية" },
];

export default function SupplierAllotmentsPage() {
  const { suppliers } = useSuppliers();
  const [filterSupplier, setFilterSupplier] = useState<string | undefined>();
  const { allotments, isLoading, createAllotment, deleteAllotment } = useSupplierAllotments(filterSupplier);
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

  const handleCreate = async () => {
    if (!form.supplier_id || !form.allotment_name || !form.start_date || !form.end_date) return;
    await createAllotment.mutateAsync(form);
    setOpen(false);
    setForm({ service_type: "hotel", currency: "EGP", status: "active", total_quantity: 0, used_quantity: 0, release_days: 7, cost_per_unit: 0 });
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "-";

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" />بلوكات المخزون (Allotments)</h1>
          <p className="text-muted-foreground">إدارة الكميات المحجوزة من الموردين</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
                <Select value={form.service_type} onValueChange={(v: any) => setForm({ ...form, service_type: v })}>
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
                <Label>إفراج تلقائي قبل (أيام)</Label>
                <Input type="number" value={form.release_days || 7} onChange={(e) => setForm({ ...form, release_days: +e.target.value })} />
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
                <Input type="number" value={form.total_quantity || 0} onChange={(e) => setForm({ ...form, total_quantity: +e.target.value })} />
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
              <Button onClick={handleCreate} disabled={createAllotment.isPending}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              ) : allotments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد بلوكات</TableCell></TableRow>
              ) : allotments.map((a) => {
                const pct = a.total_quantity > 0 ? (a.used_quantity / a.total_quantity) * 100 : 0;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.allotment_name}</TableCell>
                    <TableCell>{supplierName(a.supplier_id)}</TableCell>
                    <TableCell><Badge variant="outline">{SERVICE_TYPES.find((t) => t.value === a.service_type)?.label}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(a.start_date), "yyyy-MM-dd")}<br />{format(new Date(a.end_date), "yyyy-MM-dd")}</TableCell>
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
                      <Button size="icon" variant="ghost" onClick={() => deleteAllotment.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
