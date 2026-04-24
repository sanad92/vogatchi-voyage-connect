import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialName?: string;
  defaultType?: string;
  onCreated: (s: { id: string; name: string }) => void;
}

const QuickAddSupplierDialog = ({ open, onOpenChange, initialName = "", defaultType = "hotel", onCreated }: Props) => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(defaultType);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setType(defaultType);
      setPhone("");
      setEmail("");
      setPaymentTerms("");
    }
  }, [open, initialName, defaultType]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("اسم المورد مطلوب");
      return;
    }
    if (!orgId) {
      toast.error("لا يمكن تحديد المؤسسة");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: name.trim(),
          type,
          phone: phone.trim() || null,
          email: email.trim() || null,
          payment_terms: paymentTerms.trim() || null,
          payment_type: "deferred",
          payment_method_options: JSON.stringify([]),
          is_active: true,
          organization_id: orgId,
        })
        .select("id, name")
        .single();
      if (error) throw error;
      toast.success("تم إضافة المورد بنجاح");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["hotel-suppliers-combobox"] });
      onCreated({ id: data.id, name: data.name });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "فشل إضافة المورد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مورد جديد بسرعة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qas-name">اسم المورد *</Label>
            <Input
              id="qas-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شركة Booking.com"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نوع المورد</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">فنادق</SelectItem>
                  <SelectItem value="flight">طيران</SelectItem>
                  <SelectItem value="transport">نقل</SelectItem>
                  <SelectItem value="car_rental">تأجير سيارات</SelectItem>
                  <SelectItem value="package">باقات سياحية</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qas-phone">الهاتف</Label>
              <Input id="qas-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qas-email">البريد الإلكتروني</Label>
            <Input id="qas-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qas-terms">شروط الدفع (اختياري)</Label>
            <Input id="qas-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="مثال: 30 يوم" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جاري الحفظ...</> : "حفظ المورد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddSupplierDialog;
