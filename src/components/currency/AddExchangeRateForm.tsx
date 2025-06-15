
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

interface AddExchangeRateFormProps {
  onAddRate: (rate: any) => void;
  showForm: boolean;
  onToggleForm: () => void;
}

const AddExchangeRateForm = ({ onAddRate, showForm, onToggleForm }: AddExchangeRateFormProps) => {
  const { toast } = useToast();
  const [newRate, setNewRate] = useState({
    from_currency: '',
    to_currency: '',
    rate: 0,
    effective_date: new Date().toISOString().split('T')[0]
  });

  const handleAddRate = async () => {
    if (!newRate.from_currency || !newRate.to_currency || !newRate.rate) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (newRate.from_currency === newRate.to_currency) {
      toast({
        title: "خطأ في البيانات",
        description: "لا يمكن أن تكون العملة المصدر والوجهة متشابهة",
        variant: "destructive",
      });
      return;
    }

    onAddRate({
      ...newRate,
      is_active: true
    });

    setNewRate({
      from_currency: '',
      to_currency: '',
      rate: 0,
      effective_date: new Date().toISOString().split('T')[0]
    });
    onToggleForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>إدارة أسعار الصرف يدوياً</CardTitle>
          <Button onClick={onToggleForm}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة سعر صرف
          </Button>
        </div>
      </CardHeader>
      {showForm && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">من العملة</label>
              <Select value={newRate.from_currency} onValueChange={(value) => setNewRate({...newRate, from_currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency} - {CURRENCY_SYMBOLS[currency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى العملة</label>
              <Select value={newRate.to_currency} onValueChange={(value) => setNewRate({...newRate, to_currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency} - {CURRENCY_SYMBOLS[currency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">السعر</label>
              <Input
                type="number"
                step="0.000001"
                value={newRate.rate}
                onChange={(e) => setNewRate({...newRate, rate: parseFloat(e.target.value) || 0})}
                placeholder="0.000000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">تاريخ السريان</label>
              <Input
                type="date"
                value={newRate.effective_date}
                onChange={(e) => setNewRate({...newRate, effective_date: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddRate}>إضافة السعر</Button>
            <Button variant="outline" onClick={onToggleForm}>إلغاء</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AddExchangeRateForm;
