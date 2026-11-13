import { useState } from 'react';
import SupplierStatsCards from './SupplierStatsCards';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import SupplierForm from './SupplierForm';
import SupplierGrid from './SupplierGrid';
import SupplierAdvancedFilters from './SupplierAdvancedFilters';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import { useToast } from '@/hooks/use-toast';
import { Supplier } from '@/types/supplier';
import { SupplierFormData } from './SupplierForm';
import { SupplierCurrencySetupData } from '../shared/SupplierCurrencySetup';
import { useClientPagination } from '@/hooks/useClientPagination';
import PaginationControlsUI from '@/components/ui/pagination-controls';

const SuppliersOverview = () => {
  const { hasPermission } = useSupabasePermissions();
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  // الأنواع متوافقة الآن مع الفلاتر (كل شيء optional)
  const [advancedFilters, setAdvancedFilters] = useState<{
    type?: string;
    status?: string;
    minRating?: number;
    search?: string;
  }>({
    status: 'active',
  });
  const { 
    suppliers: suppliersList, 
    suppliersLoading: isLoading, 
    addSupplier,
    isAddingSupplier,
    updateSupplier,
    isUpdatingSupplier,
    deleteSupplier,
    isDeletingSupplier
  } = useSuppliers(undefined, true);
  const suppliers = suppliersList as Supplier[];

  const search = advancedFilters.search?.trim().toLowerCase() || '';
  const filteredSuppliers = suppliers.filter(supplier => {
    const searchMatch = [supplier.name, supplier.contact_person, supplier.email, supplier.phone]
      .some(value => value?.toLowerCase().includes(search)) || !search;
    // النوع
    const typeMatch = advancedFilters.type ? supplier.supplier_type === advancedFilters.type : true;
    // الحالة
    const statusMatch = advancedFilters.status
      ? (advancedFilters.status === 'active' ? supplier.is_active : !supplier.is_active)
      : true;
    // الحد الأدنى للتقييم
    const minRatingMatch =
      advancedFilters.minRating ? (supplier.rating || 0) >= advancedFilters.minRating : true;

    return searchMatch && typeMatch && statusMatch && minRatingMatch;
  });

  const { paginatedItems, pagination } = useClientPagination(filteredSuppliers, 25);

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
        supplier_type: formData.supplier_type,
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

  return (
    <div className="space-y-4">
      <SupplierStatsCards
        totalSuppliers={suppliers.length}
        activeSuppliers={suppliers.filter(s => s.is_active).length}
        avgRating={suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / (suppliers.length || 1)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SupplierAdvancedFilters onFilterChange={setAdvancedFilters} currentFilters={advancedFilters} />
        {hasPermission('suppliers_create') && (
          <Button onClick={() => setShowAddForm(open => !open)}>
            <Plus className="size-4" /> إضافة مورد جديد
          </Button>
        )}
      </div>
      {hasPermission('suppliers_create') && (
        <SupplierForm isVisible={showAddForm} isLoading={isAddingSupplier}
          onSubmit={handleFormSubmit} onCancel={() => setShowAddForm(false)} />
      )}
      <SupplierGrid
        suppliers={paginatedItems}
        isLoading={isLoading}
        updateSupplier={hasPermission('suppliers_edit') ? updateSupplier : undefined}
        isUpdatingSupplier={isUpdatingSupplier}
        deleteSupplier={hasPermission('suppliers_delete') ? deleteSupplier : undefined}
        isDeletingSupplier={isDeletingSupplier}
      />
      <PaginationControlsUI pagination={pagination} />
    </div>
  );
};

export default SuppliersOverview;
