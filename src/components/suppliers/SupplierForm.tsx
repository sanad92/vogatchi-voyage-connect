
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PaymentMethodsSelector from '@/components/shared/PaymentMethodsSelector';
import SupplierCurrencySetup, { SupplierCurrencySetupData } from '@/components/shared/SupplierCurrencySetup';

interface SupplierFormData {
  name: string;
  supplier_type: 'hotel' | 'airline' | 'transport' | 'tour';
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  bank_name: string;
  bank_account: string;
  tax_number: string;
  payment_terms: string;
  payment_type: 'prepaid' | 'deferred';
  payment_method_options: string[];
  credit_limit: number;
  notes: string;
  is_active: boolean;
}

interface SupplierFormProps {
  isVisible: boolean;
  isLoading: boolean;
  onSubmit: (data: SupplierFormData, currencies: SupplierCurrencySetupData[]) => void;
  onCancel: () => void;
}

const SupplierForm = ({ isVisible, isLoading, onSubmit, onCancel }: SupplierFormProps) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    supplier_type: 'hotel',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    bank_name: '',
    bank_account: '',
    tax_number: '',
    payment_terms: '',
    payment_type: 'deferred',
    payment_method_options: ['bank_transfer'],
    credit_limit: 0,
    notes: '',
    is_active: true
  });

  const [supplierCurrencies, setSupplierCurrencies] = useState<SupplierCurrencySetupData[]>([
    { currency: 'EGP', is_primary: true }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, supplierCurrencies);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      supplier_type: 'hotel',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      bank_name: '',
      bank_account: '',
      tax_number: '',
      payment_terms: '',
      payment_type: 'deferred',
      payment_method_options: ['bank_transfer'],
      credit_limit: 0,
      notes: '',
      is_active: true
    });
    setSupplierCurrencies([{ currency: 'EGP', is_primary: true }]);
  };

  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة مورد جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* المعلومات الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="اسم المورد"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
            <Select value={formData.supplier_type} onValueChange={(value: any) => setFormData({...formData, supplier_type: value})}>
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
              value={formData.contact_person}
              onChange={e => setFormData({...formData, contact_person: e.target.value})}
            />
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <Input
              type="tel"
              placeholder="رقم الهاتف"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            <Input
              placeholder="العنوان"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          {/* شروط الدفع المحسنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">نوع الدفع</label>
              <Select value={formData.payment_type} onValueChange={(value: any) => setFormData({...formData, payment_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">دفع مسبق</SelectItem>
                  <SelectItem value="deferred">دفع آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">شروط الدفع التفصيلية</label>
              <Input
                placeholder="مثال: 30 يوم من تاريخ الفاتورة"
                value={formData.payment_terms}
                onChange={e => setFormData({...formData, payment_terms: e.target.value})}
              />
            </div>
          </div>

          {/* وسائل الدفع المتاحة */}
          <PaymentMethodsSelector
            selectedMethods={formData.payment_method_options}
            onMethodsChange={(methods) => setFormData({...formData, payment_method_options: methods})}
          />

          {/* العملات المدعومة */}
          <SupplierCurrencySetup
            currencies={supplierCurrencies}
            onCurrenciesChange={setSupplierCurrencies}
          />

          {/* ملاحظات إضافية */}
          <Textarea
            placeholder="ملاحظات إضافية"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            rows={3}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : "حفظ المورد"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onCancel(); }}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SupplierForm;
export type { SupplierFormData };
