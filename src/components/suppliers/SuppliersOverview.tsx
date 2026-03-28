import { useState } from 'react';
import SupplierStatsCards from './SupplierStatsCards';
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierSearchAndAdd from './SupplierSearchAndAdd';
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

interface SuppliersOverviewProps {
  onSupplierSelect: (id: string) => void;
}

const SuppliersOverview = ({ onSupplierSelect }: SuppliersOverviewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  // الأنواع متوافقة الآن مع الفلاتر (كل شيء optional)
  const [advancedFilters, setAdvancedFilters] = useState<{
    type?: string;
    status?: string;
    minRating?: number;
    search?: string;
  }>({
    type: '',
    status: '',
    minRating: undefined,
    search: '',
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
  } = useSuppliers();
  const suppliers = suppliersList as Supplier[];

  // فلترة متقدمة:
  const filteredSuppliers = suppliers.filter(supplier => {
    // نص البحث بالاسم أو المسؤول/الإيميل
    const searchMatch =
      (advancedFilters.search || searchTerm)
        ? (
            supplier.name?.toLowerCase().includes((advancedFilters.search || searchTerm).toLowerCase()) ||
            supplier.contact_person?.toLowerCase().includes((advancedFilters.search || searchTerm).toLowerCase()) ||
            supplier.email?.toLowerCase().includes((advancedFilters.search || searchTerm).toLowerCase())
          )
        : true;
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

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const avgRating = suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / (suppliers.length || 1);

  return (
    <div className="space-y-6">
      <SupplierStatsCards 
        totalSuppliers={suppliers.length}
        activeSuppliers={suppliers.filter(s => s.is_active).length}
        avgRating={suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / (suppliers.length || 1)}
      />
      {/* شريط الفلاتر المتقدمة */}
      <SupplierAdvancedFilters
        onFilterChange={setAdvancedFilters}
        currentFilters={advancedFilters}
      />
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
        suppliers={paginatedItems}
        isLoading={isLoading}
        onSupplierSelect={onSupplierSelect}
        updateSupplier={updateSupplier}
        isUpdatingSupplier={isUpdatingSupplier}
        deleteSupplier={deleteSupplier}
        isDeletingSupplier={isDeletingSupplier}
      />
      <PaginationControlsUI pagination={pagination} />
    </div>
  );
};

export default SuppliersOverview;
