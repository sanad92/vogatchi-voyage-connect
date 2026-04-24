import { useState } from "react";
import { useSupplierRates, type SupplierRate } from "@/hooks/useSupplierRates";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag } from "lucide-react";
import { format } from "date-fns";

const SERVICE_TYPES = [
  { value: "hotel", label: "فندق" },
  { value: "flight", label: "طيران" },
  { value: "transport", label: "نقل" },
  { value: "car_rental", label: "تأجير سيارات" },
  { value: "tour", label: "باقة سياحية" },
  { value: "other", label: "أخرى" },
];

export default function SupplierRatesPage() {
  const { suppliers } = useSuppliers();
  const [filterSupplier, setFilterSupplier] = useState<string | undefined>();
  const { rates, isLoading, createRate, deleteRate } = useSupplierRates(filterSupplier);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SupplierRate>>({
    service_type: "hotel",
    currency: "EGP",
    is_active: true,
    cost_price: 0,
    selling_price: 0,
    markup_percentage: 0,
  });

  const handleCreate = async () => {
    if (!form.supplier_id || !form.start_date || !form.end_date) return;
    await createRate.mutateAsync(form);
    setOpen(false);
    setForm({ service_type: "hotel", currency: "EGP", is_active: true, cost_price: 0, selling_price: 0, markup_percentage: 0 });
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "-";

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" />الأسعار الموسمية</h1>
          <p className="text-muted-foreground">إدارة أسعار الموردين حسب الموسم والتاريخ</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />سعر جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>إضافة سعر موسمي</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>المورد *</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
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
                <Label>اسم الموسم</Label>
                <Input value={form.season_name || ""} onChange={(e) => setForm({ ...form, season_name: e.target.value })} placeholder="High / Low / Ramadan" />
              </div>
              <div>
                <Label>المرجع</Label>
                <Input value={form.service_reference || ""} onChange={(e) => setForm({ ...form, service_reference: e.target.value })} placeholder="نوع الغرفة / الفئة" />
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
                <Label>سعر التكلفة</Label>
                <Input type="number" value={form.cost_price || 0} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} />
              </div>
              <div>
                <Label>سعر البيع</Label>
                <Input type="number" value={form.selling_price || 0} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} />
              </div>
              <div>
                <Label>نسبة الربح %</Label>
                <Input type="number" value={form.markup_percentage || 0} onChange={(e) => setForm({ ...form, markup_percentage: +e.target.value })} />
              </div>
              <div>
                <Label>العملة</Label>
                <Input value={form.currency || "EGP"} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createRate.isPending}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تصفية</CardTitle>
        </CardHeader>
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
                <TableHead>المورد</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>الموسم</TableHead>
                <TableHead>الفترة</TableHead>
                <TableHead>التكلفة</TableHead>
                <TableHead>البيع</TableHead>
                <TableHead>الربح</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center">جارٍ التحميل...</TableCell></TableRow>
              ) : rates.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد أسعار</TableCell></TableRow>
              ) : rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{supplierName(r.supplier_id)}</TableCell>
                  <TableCell><Badge variant="outline">{SERVICE_TYPES.find((t) => t.value === r.service_type)?.label}</Badge></TableCell>
                  <TableCell>{r.season_name || "-"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.start_date), "yyyy-MM-dd")}<br />{format(new Date(r.end_date), "yyyy-MM-dd")}</TableCell>
                  <TableCell>{r.cost_price.toLocaleString()} {r.currency}</TableCell>
                  <TableCell>{r.selling_price.toLocaleString()} {r.currency}</TableCell>
                  <TableCell><Badge>{(r.selling_price - r.cost_price).toLocaleString()}</Badge></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => deleteRate.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
