
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, FileText, Plus, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency, SupplierContract } from '@/types/currency';

interface SupplierContractsProps {
  supplierId?: string | null;
}

const SupplierContracts = ({ supplierId }: SupplierContractsProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newContract, setNewContract] = useState({
    supplier_id: supplierId || '',
    contract_number: '',
    contract_type: 'service' as const,
    start_date: '',
    end_date: '',
    contract_value: 0,
    currency: 'EGP' as SupportedCurrency,
    payment_terms: '',
    terms_and_conditions: ''
  });

  // استعلام العقود
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['supplier-contracts', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      const { data, error } = await supabase
        .from('supplier_contracts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SupplierContract[];
    },
    enabled: !!supplierId
  });

  // إضافة عقد جديد
  const addContractMutation = useMutation({
    mutationFn: async (contract: typeof newContract) => {
      const { data, error } = await supabase
        .from('supplier_contracts')
        .insert([{
          supplier_id: contract.supplier_id,
          contract_number: contract.contract_number,
          contract_type: contract.contract_type,
          start_date: contract.start_date,
          end_date: contract.end_date,
          contract_value: contract.contract_value,
          currency: contract.currency,
          payment_terms: contract.payment_terms,
          terms_and_conditions: contract.terms_and_conditions
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-contracts'] });
      setNewContract({
        supplier_id: supplierId || '',
        contract_number: '',
        contract_type: 'service',
        start_date: '',
        end_date: '',
        contract_value: 0,
        currency: 'EGP',
        payment_terms: '',
        terms_and_conditions: ''
      });
      setShowAddForm(false);
      toast({
        title: "تم إضافة العقد بنجاح",
        description: "تم حفظ بيانات العقد الجديد",
      });
    }
  });

  const getContractTypeLabel = (type: string) => {
    const types = {
      service: "خدمة",
      supply: "توريد",
      maintenance: "صيانة"
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusColor = (contract: SupplierContract) => {
    const now = new Date();
    const endDate = new Date(contract.end_date);
    const startDate = new Date(contract.start_date);
    
    if (!contract.is_active) return "bg-gray-100 text-gray-800";
    if (now > endDate) return "bg-red-100 text-red-800";
    if (now < startDate) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusLabel = (contract: SupplierContract) => {
    const now = new Date();
    const endDate = new Date(contract.end_date);
    const startDate = new Date(contract.start_date);
    
    if (!contract.is_active) return "غير نشط";
    if (now > endDate) return "منتهي";
    if (now < startDate) return "لم يبدأ";
    return "نشط";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.contract_number.trim() || !supplierId) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }
    addContractMutation.mutate({
      ...newContract,
      supplier_id: supplierId
    });
  };

  if (!supplierId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">يرجى اختيار مورد لعرض العقود</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* زر إضافة عقد جديد */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">عقود المورد</h3>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة عقد جديد
        </Button>
      </div>

      {/* نموذج إضافة عقد */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة عقد جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="رقم العقد"
                value={newContract.contract_number}
                onChange={e => setNewContract({...newContract, contract_number: e.target.value})}
                required
              />
              <Select value={newContract.contract_type} onValueChange={(value: any) => setNewContract({...newContract, contract_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع العقد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">خدمة</SelectItem>
                  <SelectItem value="supply">توريد</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="تاريخ البداية"
                value={newContract.start_date}
                onChange={e => setNewContract({...newContract, start_date: e.target.value})}
                required
              />
              <Input
                type="date"
                placeholder="تاريخ النهاية"
                value={newContract.end_date}
                onChange={e => setNewContract({...newContract, end_date: e.target.value})}
                required
              />
              <Input
                type="number"
                placeholder="قيمة العقد"
                value={newContract.contract_value}
                onChange={e => setNewContract({...newContract, contract_value: parseFloat(e.target.value) || 0})}
                required
              />
              <Select value={newContract.currency} onValueChange={(value: SupportedCurrency) => setNewContract({...newContract, currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">{CURRENCY_NAMES.EGP} ({CURRENCY_SYMBOLS.EGP})</SelectItem>
                  <SelectItem value="USD">{CURRENCY_NAMES.USD} ({CURRENCY_SYMBOLS.USD})</SelectItem>
                  <SelectItem value="SAR">{CURRENCY_NAMES.SAR} ({CURRENCY_SYMBOLS.SAR})</SelectItem>
                  <SelectItem value="EUR">{CURRENCY_NAMES.EUR} ({CURRENCY_SYMBOLS.EUR})</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="شروط الدفع"
                value={newContract.payment_terms}
                onChange={e => setNewContract({...newContract, payment_terms: e.target.value})}
              />
              <div className="md:col-span-2">
                <Textarea
                  placeholder="شروط وأحكام العقد"
                  value={newContract.terms_and_conditions}
                  onChange={e => setNewContract({...newContract, terms_and_conditions: e.target.value})}
                  rows={4}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={addContractMutation.isPending}>
                  {addContractMutation.isPending ? "جاري الحفظ..." : "حفظ العقد"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* قائمة العقود */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل العقود...</div>
        ) : contracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد عقود لهذا المورد</p>
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      عقد #{contract.contract_number}
                    </h4>
                    <p className="text-gray-600">نوع العقد: {getContractTypeLabel(contract.contract_type)}</p>
                  </div>
                  <div className="text-left">
                    <Badge className={getStatusColor(contract)}>
                      {getStatusLabel(contract)}
                    </Badge>
                    <div className="mt-2 text-lg font-bold flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {contract.contract_value.toLocaleString()} {CURRENCY_SYMBOLS[contract.currency]}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium">تاريخ البداية:</span>
                    <p>{new Date(contract.start_date).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ النهاية:</span>
                    <p>{new Date(contract.end_date).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div>
                    <span className="font-medium">العملة:</span>
                    <p>{CURRENCY_NAMES[contract.currency]} ({CURRENCY_SYMBOLS[contract.currency]})</p>
                  </div>
                  <div>
                    <span className="font-medium">شروط الدفع:</span>
                    <p>{contract.payment_terms}</p>
                  </div>
                </div>

                {contract.terms_and_conditions && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <span className="font-medium">شروط وأحكام العقد:</span>
                    <p className="text-sm mt-1">{contract.terms_and_conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SupplierContracts;
