import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Building, Star, DollarSign, Calendar, Users, TrendingUp, Plus, Search, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency } from '@/types/currency';
import SupplierContracts from './SupplierContracts';
import SupplierPayments from './SupplierPayments';
import SupplierRatings from './SupplierRatings';
import SupplierAnalytics from './SupplierAnalytics';

interface Supplier {
  id: string;
  name: string;
  type: 'hotel' | 'airline' | 'transport' | 'tour';
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account: string | null;
  tax_number: string | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean | null;
  preferred_currency: SupportedCurrency;
  payment_terms: string | null;
  credit_limit: number | null;
  created_at: string;
}

const AdvancedSupplierManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    type: 'hotel' as const,
    contact_person: '',
    email: '',
    phone: '',
    bank_name: '',
    bank_account: '',
    tax_number: '',
    preferred_currency: 'EGP' as SupportedCurrency,
    payment_terms: '',
    credit_limit: 0,
    notes: ''
  });

  // استعلام الموردين
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data.map(supplier => ({
        ...supplier,
        preferred_currency: supplier.preferred_currency || 'EGP',
        credit_limit: supplier.credit_limit || 0
      })) as Supplier[];
    }
  });

  // إضافة مورد جديد
  const addSupplierMutation = useMutation({
    mutationFn: async (supplier: typeof newSupplier) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          ...supplier,
          rating: 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setNewSupplier({
        name: '',
        type: 'hotel',
        contact_person: '',
        email: '',
        phone: '',
        bank_name: '',
        bank_account: '',
        tax_number: '',
        preferred_currency: 'EGP',
        payment_terms: '',
        credit_limit: 0,
        notes: ''
      });
      setShowAddForm(false);
      toast({
        title: "تم إضافة المورد بنجاح",
        description: "تم حفظ بيانات المورد الجديد",
      });
    }
  });

  const getTypeLabel = (type: string) => {
    const types = {
      hotel: "فندق",
      airline: "طيران", 
      transport: "نقل",
      tour: "جولة سياحية"
    };
    return types[type as keyof typeof types] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      hotel: "bg-blue-100 text-blue-800",
      airline: "bg-green-100 text-green-800",
      transport: "bg-yellow-100 text-yellow-800",
      tour: "bg-purple-100 text-purple-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const renderStars = (rating: number | null) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= ratingValue ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      toast({
        title: "اسم المورد مطلوب",
        variant: "destructive",
      });
      return;
    }
    addSupplierMutation.mutate(newSupplier);
  };

  // حساب الإحصائيات
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const avgRating = suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / totalSuppliers || 0;

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي الموردين</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">الموردين النشطين</p>
                <p className="text-2xl font-bold">{activeSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">متوسط التقييم</p>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">العملة الأساسية</p>
                <p className="text-2xl font-bold">EGP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            العقود
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            المدفوعات
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            التقييمات
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* شريط البحث والإضافة */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في الموردين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مورد جديد
            </Button>
          </div>

          {/* نموذج إضافة مورد */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>إضافة مورد جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="اسم المورد"
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                    required
                  />
                  <Select value={newSupplier.type} onValueChange={(value: any) => setNewSupplier({...newSupplier, type: value})}>
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
                    value={newSupplier.contact_person}
                    onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                  />
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                  />
                  <Input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                  />
                  <Select value={newSupplier.preferred_currency} onValueChange={(value: SupportedCurrency) => setNewSupplier({...newSupplier, preferred_currency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="العملة المفضلة" />
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
                    value={newSupplier.payment_terms}
                    onChange={e => setNewSupplier({...newSupplier, payment_terms: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="حد الائتمان"
                    value={newSupplier.credit_limit}
                    onChange={e => setNewSupplier({...newSupplier, credit_limit: parseFloat(e.target.value) || 0})}
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      placeholder="ملاحظات إضافية"
                      value={newSupplier.notes}
                      onChange={e => setNewSupplier({...newSupplier, notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="submit" disabled={addSupplierMutation.isPending}>
                      {addSupplierMutation.isPending ? "جاري الحفظ..." : "حفظ المورد"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* قائمة الموردين */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-8">جاري تحميل الموردين...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">لا يوجد موردون مطابقون للبحث</div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedSupplier(supplier.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <Badge className={getTypeColor(supplier.type)}>
                        {getTypeLabel(supplier.type)}
                      </Badge>
                    </div>
                    {supplier.rating && supplier.rating > 0 && (
                      <div className="flex items-center gap-2">
                        {renderStars(supplier.rating)}
                        <span className="text-sm text-gray-600">({supplier.rating}/5)</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {supplier.contact_person && (
                        <p><span className="font-medium">الشخص المسؤول:</span> {supplier.contact_person}</p>
                      )}
                      {supplier.phone && (
                        <p><span className="font-medium">الهاتف:</span> {supplier.phone}</p>
                      )}
                      {supplier.email && (
                        <p><span className="font-medium">البريد:</span> {supplier.email}</p>
                      )}
                      <p><span className="font-medium">العملة المفضلة:</span> {CURRENCY_NAMES[supplier.preferred_currency as SupportedCurrency]} ({CURRENCY_SYMBOLS[supplier.preferred_currency as SupportedCurrency]})</p>
                      {supplier.payment_terms && (
                        <p><span className="font-medium">شروط الدفع:</span> {supplier.payment_terms}</p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant={supplier.is_active ? "default" : "secondary"}>
                          {supplier.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <SupplierContracts supplierId={selectedSupplier} />
        </TabsContent>

        <TabsContent value="payments">
          <SupplierPayments supplierId={selectedSupplier} />
        </TabsContent>

        <TabsContent value="ratings">
          <SupplierRatings supplierId={selectedSupplier} />
        </TabsContent>

        <TabsContent value="analytics">
          <SupplierAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedSupplierManagement;
