import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building } from 'lucide-react';

interface AddRentContractDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContract: (contractData: any) => void;
  isAddingContract: boolean;
}

const AddRentContractDialog = ({ 
  isOpen, 
  onOpenChange, 
  onAddContract, 
  isAddingContract 
}: AddRentContractDialogProps) => {
  const [contractData, setContractData] = useState({
    contract_number: '',
    property_type: 'office',
    property_address: '',
    landlord_name: '',
    landlord_phone: '',
    monthly_rent: 0,
    currency: 'EGP', // تغيير الافتراضي إلى EGP
    start_date: '',
    end_date: '',
    renewal_period_months: 12,
    annual_increase_percentage: 0,
    security_deposit: 0,
    contract_terms: '',
    is_active: true
  });

  const handleAddContract = () => {
    onAddContract(contractData);
    onOpenChange(false);
    setContractData({
      contract_number: '',
      property_type: 'office',
      property_address: '',
      landlord_name: '',
      landlord_phone: '',
      monthly_rent: 0,
      currency: 'EGP', // تغيير الافتراضي إلى EGP
      start_date: '',
      end_date: '',
      renewal_period_months: 12,
      annual_increase_percentage: 0,
      security_deposit: 0,
      contract_terms: '',
      is_active: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة عقد إيجار جديد</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>رقم العقد</Label>
            <Input
              value={contractData.contract_number}
              onChange={(e) => setContractData({...contractData, contract_number: e.target.value})}
              placeholder="رقم العقد"
            />
          </div>
          <div className="space-y-2">
            <Label>نوع العقار</Label>
            <Select value={contractData.property_type} onValueChange={(value) => setContractData({...contractData, property_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">مكتب</SelectItem>
                <SelectItem value="warehouse">مستودع</SelectItem>
                <SelectItem value="shop">محل تجاري</SelectItem>
                <SelectItem value="apartment">شقة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>عنوان العقار</Label>
            <Input
              value={contractData.property_address}
              onChange={(e) => setContractData({...contractData, property_address: e.target.value})}
              placeholder="العنوان الكامل للعقار"
            />
          </div>
          <div className="space-y-2">
            <Label>اسم المالك</Label>
            <Input
              value={contractData.landlord_name}
              onChange={(e) => setContractData({...contractData, landlord_name: e.target.value})}
              placeholder="اسم مالك العقار"
            />
          </div>
          <div className="space-y-2">
            <Label>هاتف المالك</Label>
            <Input
              value={contractData.landlord_phone}
              onChange={(e) => setContractData({...contractData, landlord_phone: e.target.value})}
              placeholder="رقم هاتف المالك"
            />
          </div>
          <div className="space-y-2">
            <Label>الإيجار الشهري</Label>
            <Input
              type="number"
              value={contractData.monthly_rent}
              onChange={(e) => setContractData({...contractData, monthly_rent: Number(e.target.value)})}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>العملة</Label>
            <Select value={contractData.currency} onValueChange={(value) => setContractData({...contractData, currency: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
                <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
                <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                <SelectItem value="EUR">يورو (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>تاريخ بداية العقد</Label>
            <Input
              type="date"
              value={contractData.start_date}
              onChange={(e) => setContractData({...contractData, start_date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>تاريخ انتهاء العقد</Label>
            <Input
              type="date"
              value={contractData.end_date}
              onChange={(e) => setContractData({...contractData, end_date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>مدة التجديد (بالأشهر)</Label>
            <Input
              type="number"
              value={contractData.renewal_period_months}
              onChange={(e) => setContractData({...contractData, renewal_period_months: Number(e.target.value)})}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label>نسبة الزيادة السنوية (%)</Label>
            <Input
              type="number"
              value={contractData.annual_increase_percentage}
              onChange={(e) => setContractData({...contractData, annual_increase_percentage: Number(e.target.value)})}
              min="0"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label>مبلغ التأمين</Label>
            <Input
              type="number"
              value={contractData.security_deposit}
              onChange={(e) => setContractData({...contractData, security_deposit: Number(e.target.value)})}
              min="0"
              step="0.01"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>شروط العقد</Label>
            <Textarea
              value={contractData.contract_terms}
              onChange={(e) => setContractData({...contractData, contract_terms: e.target.value})}
              placeholder="الشروط والأحكام الخاصة بالعقد"
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleAddContract}
            disabled={!contractData.contract_number || !contractData.property_address || !contractData.landlord_name || isAddingContract}
          >
            <Building className="h-4 w-4 mr-2" />
            {isAddingContract ? 'جاري الإضافة...' : 'إضافة العقد'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRentContractDialog;
