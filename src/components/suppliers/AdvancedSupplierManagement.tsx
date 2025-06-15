
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Star, DollarSign, Calendar, Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SupportedCurrency } from '@/types/currency';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import SupplierContracts from './SupplierContracts';
import SupplierPayments from './SupplierPayments';
import SupplierRatings from './SupplierRatings';
import SupplierAnalytics from './SupplierAnalytics';
import SupplierCurrencyManager from './SupplierCurrencyManager';
import { SupplierCurrencySetupData } from '@/components/shared/SupplierCurrencySetup';
import SupplierStatsCards from './SupplierStatsCards';
import SupplierSearchAndAdd from './SupplierSearchAndAdd';
import SupplierForm, { SupplierFormData } from './SupplierForm';
import SupplierGrid from './SupplierGrid';
import SupplierPermissionCheck from './SupplierPermissionCheck';

import { Supplier } from '@/types/supplier'; // <-- USE PROJECT TYPE

const AdvancedSupplierManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const { 
    suppliers: suppliersList, 
    suppliersLoading: isLoading, 
    addSupplier,
    isAddingSupplier,
    updateSupplier,
    isUpdatingSupplier,
    deleteSupplier,
    isDeletingSupplier
  } = useSuppliers();

  // استعلام الموردين
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      // Map 'type' from DB to 'supplier_type' expected by app types
      return data.map((supplier: any) => ({
        ...supplier,
        supplier_type: supplier.supplier_type || supplier.type, // prefer supplier_type if exists, else type
        type: undefined, // remove local 'type' property if present
        payment_method_options: supplier.payment_method_options || ['bank_transfer'],
        payment_type: supplier.payment_type || 'deferred',
        is_active: supplier.is_active ?? true,
        credit_limit: supplier.credit_limit || 0,
      })) as Supplier[];
    }
  });

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { addCurrency } = useSupplierCurrencies();

  const handleFormSubmit = async (formData: SupplierFormData, currencies: SupplierCurrencySetupData[]) => {
    if (!formData.name.trim()) {
      toast({
        title: "اسم المورد مطلوب",
        variant: "destructive",
      });
      return;
    }
    try {
      const supplierData = {
        ...formData,
        supplier_type: formData.supplier_type, // Ensure supplier_type is present
        payment_method_options: formData.payment_method_options
      };
      await new Promise((resolve, reject) => {
        addSupplier(supplierData, {
          onSuccess: async (addedSupplier: any) => {
            try {
              for (const currency of currencies) {
                await addCurrency({
                  supplier_id: addedSupplier.id,
                  currency: currency.currency,
                  is_primary: currency.is_primary,
                  exchange_rate: currency.exchange_rate || null,
                  notes: currency.notes || null
                });
              }
              resolve(addedSupplier);
            } catch (error) {
              reject(error);
            }
          },
          onError: reject
        });
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding supplier with currencies:', error);
    }
  };

  // حساب الإحصائيات
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const avgRating = suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / totalSuppliers || 0;

  return (
    <SupplierPermissionCheck>
      <div className="space-y-6">
        <SupplierStatsCards 
          totalSuppliers={totalSuppliers}
          activeSuppliers={activeSuppliers}
          avgRating={avgRating}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="currencies" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              العملات
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
            <SupplierPermissionCheck action="create">
              <SupplierSearchAndAdd
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAddClick={() => setShowAddForm(!showAddForm)}
              />

              <SupplierForm
                isVisible={showAddForm}
                isLoading={isAddingSupplier}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowAddForm(false)}
              />
            </SupplierPermissionCheck>

            <SupplierGrid
              suppliers={filteredSuppliers}
              isLoading={isLoading}
              onSupplierSelect={setSelectedSupplier}
              updateSupplier={updateSupplier}
              isUpdatingSupplier={isUpdatingSupplier}
              deleteSupplier={deleteSupplier}
              isDeletingSupplier={isDeletingSupplier}
            />
          </TabsContent>

          <TabsContent value="currencies">
            {selectedSupplier ? (
              <SupplierPermissionCheck action="edit">
                <SupplierCurrencyManager supplierId={selectedSupplier} />
              </SupplierPermissionCheck>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">يرجى اختيار مورد لإدارة العملات المدعومة</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contracts">
            <SupplierPermissionCheck action="view">
              <SupplierContracts supplierId={selectedSupplier} />
            </SupplierPermissionCheck>
          </TabsContent>

          <TabsContent value="payments">
            <SupplierPermissionCheck action="view">
              <SupplierPayments supplierId={selectedSupplier} />
            </SupplierPermissionCheck>
          </TabsContent>

          <TabsContent value="ratings">
            <SupplierPermissionCheck action="view">
              <SupplierRatings supplierId={selectedSupplier} />
            </SupplierPermissionCheck>
          </TabsContent>

          <TabsContent value="analytics">
            <SupplierPermissionCheck action="view">
              <SupplierAnalytics />
            </SupplierPermissionCheck>
          </TabsContent>
        </Tabs>
      </div>
    </SupplierPermissionCheck>
  );
};

export default AdvancedSupplierManagement;
