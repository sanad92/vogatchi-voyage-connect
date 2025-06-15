import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import PaymentMethodsSelector from '@/components/shared/PaymentMethodsSelector';
import { Supplier } from '@/types/supplier';

interface EditSupplierDialogProps {
  supplier: Supplier | null;
  isOpen: boolean;
  isLoading: boolean;
  onSave: (values: Partial<Supplier> & { id: string }) => void;
  onClose: () => void;
}

const EditSupplierDialog = ({
  supplier,
  isOpen,
  isLoading,
  onSave,
  onClose,
}: EditSupplierDialogProps) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        ...supplier,
        payment_method_options: supplier.payment_method_options || [],
      });
    }
  }, [supplier]);

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات المورد</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Input
            placeholder="اسم المورد"
            value={formData.name || ''}
            onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Select value={formData.supplier_type || 'hotel'} onValueChange={val => setFormData(f => ({ ...f, supplier_type: val as Supplier["supplier_type"] }))}>
            <SelectTrigger>
              <SelectValue placeholder="نوع الخدمة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">فندق</SelectItem>
              <SelectItem value="airline">طيران</SelectItem>
              <SelectItem value="transport">نقل</SelectItem>
              <SelectItem value="tour">جولة سياحية</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="اسم الشخص المسؤول"
            value={formData.contact_person ?? ''}
            onChange={e => setFormData(f => ({ ...f, contact_person: e.target.value }))}
          />
          <Input
            type="email"
            placeholder="البريد الإلكتروني"
            value={formData.email ?? ''}
            onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
          />
          <Input
            type="tel"
            placeholder="رقم الهاتف"
            value={formData.phone ?? ''}
            onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
          />
          <Select value={formData.payment_type || 'deferred'} onValueChange={val => setFormData(f => ({ ...f, payment_type: val as "prepaid" | "deferred" }))}>
            <SelectTrigger>
              <SelectValue placeholder="نوع الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prepaid">دفع مسبق</SelectItem>
              <SelectItem value="deferred">دفع آجل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="pt-2">
          <PaymentMethodsSelector
            selectedMethods={formData.payment_method_options || []}
            onMethodsChange={methods => setFormData(f => ({ ...f, payment_method_options: methods }))}
          />
        </div>
        <Input
          placeholder="شروط الدفع"
          className="mt-2"
          value={formData.payment_terms ?? ''}
          onChange={e => setFormData(f => ({ ...f, payment_terms: e.target.value }))}
        />
        <div className="flex items-center gap-2 pt-2">
          <label>حالة المورد:</label>
          <Select value={formData.is_active === false ? "false" : "true"} onValueChange={v => setFormData(f => ({ ...f, is_active: v === "true" }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">نشط</SelectItem>
              <SelectItem value="false">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button 
            onClick={() => supplier && onSave({ ...formData, id: supplier.id })} 
            disabled={isLoading}
          >
            {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSupplierDialog;
