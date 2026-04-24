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
  onCreated: (hotel: { id: string; name: string; star_rating: number | null }) => void;
}

const QuickAddHotelDialog = ({ open, onOpenChange, initialName = "", onCreated }: Props) => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [stars, setStars] = useState<string>("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setStars("");
      setCity("");
      setPhone("");
    }
  }, [open, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("اسم الفندق مطلوب");
      return;
    }
    if (!orgId) {
      toast.error("لا يمكن تحديد المؤسسة");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("hotels")
        .insert({
          name: name.trim(),
          star_rating: stars ? parseInt(stars) : null,
          address: city.trim() || null,
          phone: phone.trim() || null,
          organization_id: orgId,
          is_active: true,
        })
        .select("id, name, star_rating")
        .single();
      if (error) throw error;
      toast.success("تم إضافة الفندق بنجاح");
      qc.invalidateQueries({ queryKey: ["hotels-combobox"] });
      onCreated({ id: data.id, name: data.name, star_rating: data.star_rating });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "فشل إضافة الفندق");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة فندق جديد بسرعة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qah-name">اسم الفندق *</Label>
            <Input
              id="qah-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: فندق ماريوت القاهرة"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>التصنيف</Label>
              <Select value={stars} onValueChange={setStars}>
                <SelectTrigger><SelectValue placeholder="نجوم" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={r.toString()}>{"⭐".repeat(r)} ({r})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qah-city">المدينة / العنوان</Label>
              <Input id="qah-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="القاهرة" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qah-phone">رقم الهاتف (اختياري)</Label>
            <Input id="qah-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جاري الحفظ...</> : "حفظ الفندق"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddHotelDialog;
