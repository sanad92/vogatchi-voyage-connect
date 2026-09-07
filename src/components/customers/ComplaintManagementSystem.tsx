import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  customer_id: string | null;
  next_update_at: string | null;
  created_at: string;
  resolution: string | null;
};
export default function ComplaintManagementSystem() {
  const orgId = useOrgId(),
    qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium",
    customer_id: "",
    next_update_at: "",
  });
  const incidents = useQuery({
    queryKey: ["customer-incidents", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sop_incidents")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Incident[];
    },
  });
  const customers = useQuery({
    queryKey: ["incident-customers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("عنوان الشكوى مطلوب");
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("sop_incidents")
        .insert({
          organization_id: orgId!,
          title: form.title.trim(),
          description: form.description.trim() || null,
          severity: form.severity,
          customer_id: form.customer_id || null,
          next_update_at: form.next_update_at
            ? new Date(form.next_update_at).toISOString()
            : null,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-incidents", orgId] });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        severity: "medium",
        customer_id: "",
        next_update_at: "",
      });
      toast.success("تم تسجيل الشكوى");
    },
    onError: (e) => toast.error(e.message),
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sop_incidents")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution: "تمت المعالجة من شاشة خدمة العملاء",
        })
        .eq("id", id)
        .eq("organization_id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-incidents", orgId] });
      toast.success("تم إغلاق الشكوى");
    },
  });
  const customerNames = new Map(
    (customers.data || []).map((customer) => [customer.id, customer.name]),
  );
  const rows = incidents.data || [],
    openCount = rows.filter(
      (r) => !["resolved", "closed"].includes(r.status),
    ).length,
    overdue = rows.filter(
      (r) =>
        !["resolved", "closed"].includes(r.status) &&
        r.next_update_at &&
        new Date(r.next_update_at) < new Date(),
    ).length;
  return (
    <Card className="mt-6" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">الشكاوى والحوادث</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {openCount} مفتوحة — {overdue} متأخرة عن التحديث
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <MessageSquarePlus className="ml-2 h-4 w-4" />
              شكوى جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل شكوى أو حادث</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>العنوان</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>التفاصيل</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>العميل</Label>
                <Select
                  value={form.customer_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, customer_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون عميل محدد</SelectItem>
                    {customers.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الأولوية</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm({ ...form, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="critical">حرجة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>موعد التحديث التالي</Label>
                  <Input
                    type="datetime-local"
                    value={form.next_update_at}
                    onChange={(e) =>
                      setForm({ ...form, next_update_at: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التحديث التالي</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isOverdue =
                  !["resolved", "closed"].includes(r.status) &&
                  r.next_update_at &&
                  new Date(r.next_update_at) < new Date();
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.title}</p>
                      <p className="max-w-80 truncate text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      {(r.customer_id && customerNames.get(r.customer_id)) || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.severity === "critical" || r.severity === "high"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {r.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className={isOverdue ? "text-destructive" : ""}>
                      {isOverdue && (
                        <AlertTriangle className="ml-1 inline h-4 w-4" />
                      )}
                      {r.next_update_at
                        ? new Date(r.next_update_at).toLocaleString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {!["resolved", "closed"].includes(r.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolve.mutate(r.id)}
                        >
                          <CheckCircle2 className="ml-1 h-4 w-4" />
                          إغلاق
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    لا توجد شكاوى مسجلة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
