
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, Calendar, Building } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const RentManagement = () => {
  const { 
    rentContracts, 
    addRentContract, 
    isAddingContract,
    contractsLoading
  } = useExpenses();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contractData, setContractData] = useState({
    contract_number: '',
    property_type: 'office',
    property_address: '',
    landlord_name: '',
    landlord_phone: '',
    monthly_rent: 0,
    currency: 'SAR',
    start_date: '',
    end_date: '',
    renewal_period_months: 12,
    annual_increase_percentage: 0,
    security_deposit: 0,
    contract_terms: '',
    is_active: true
  });

  const handleAddContract = () => {
    addRentContract(contractData);
    setIsDialogOpen(false);
    setContractData({
      contract_number: '',
      property_type: 'office',
      property_address: '',
      landlord_name: '',
      landlord_phone: '',
      monthly_rent: 0,
      currency: 'SAR',
      start_date: '',
      end_date: '',
      renewal_period_months: 12,
      annual_increase_percentage: 0,
      security_deposit: 0,
      contract_terms: '',
      is_active: true
    });
  };

  const isContractActive = (contract: any) => {
    const today = new Date();
    const endDate = new Date(contract.end_date);
    return endDate >= today && contract.is_active;
  };

  const getDaysUntilExpiry = (contract: any) => {
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              إدارة عقود الإيجار
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عقد إيجار
                </Button>
              </DialogTrigger>
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
                        <SelectItem value="SAR">ريال سعودي</SelectItem>
                        <SelectItem value="USD">دولار أمريكي</SelectItem>
                        <SelectItem value="EUR">يورو</SelectItem>
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
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rentContracts?.map((contract) => (
              <Card key={contract.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={isContractActive(contract) ? "default" : "secondary"}>
                      {isContractActive(contract) ? 'نشط' : 'منتهي'}
                    </Badge>
                    <div className="text-sm text-gray-500">
                      {contract.property_type === 'office' && 'مكتب'}
                      {contract.property_type === 'warehouse' && 'مستودع'}
                      {contract.property_type === 'shop' && 'محل تجاري'}
                      {contract.property_type === 'apartment' && 'شقة'}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{contract.contract_number}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">العنوان</p>
                    <p className="font-medium">{contract.property_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">المالك</p>
                    <p className="font-medium">{contract.landlord_name}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm text-gray-600">الإيجار الشهري</p>
                      <p className="font-medium">{contract.monthly_rent.toLocaleString()} {contract.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">مدة العقد</p>
                      <p className="font-medium">{contract.renewal_period_months} شهر</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">تاريخ الانتهاء</p>
                    <p className="font-medium">
                      {new Date(contract.end_date).toLocaleDateString('ar-SA')}
                    </p>
                    {isContractActive(contract) && (
                      <p className="text-sm text-orange-600">
                        {getDaysUntilExpiry(contract) > 0 ? 
                          `متبقي ${getDaysUntilExpiry(contract)} يوم` : 
                          'انتهى العقد'
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      المدفوعات
                    </Button>
                    <Button variant="outline" size="sm">
                      تجديد
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentManagement;
