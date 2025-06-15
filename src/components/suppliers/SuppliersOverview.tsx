
import { useState } from 'react';
import SupplierStatsCards from './SupplierStatsCards';
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierSearchAndAdd from './SupplierSearchAndAdd';
import SupplierForm from './SupplierForm';
import SupplierGrid from './SupplierGrid';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import { useToast } from '@/hooks/use-toast';
import { Supplier } from '@/types/supplier';
import { SupplierFormData } from './SupplierForm';
import { SupplierCurrencySetupData } from '../shared/SupplierCurrencySetup';

interface SuppliersOverviewProps {
  onSupplierSelect: (id: string) => void;
}

const SuppliersOverview = ({ onSupplierSelect }: SuppliersOverviewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
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
  const suppliers = suppliersList as Supplier[];

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
  const avgRating = suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / totalSuppliers || 0;

  return (
    <div className="space-y-6">
      <SupplierStatsCards 
        totalSuppliers={totalSuppliers}
        activeSuppliers={activeSuppliers}
        avgRating={avgRating}
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
        suppliers={filteredSuppliers}
        isLoading={isLoading}
        onSupplierSelect={onSupplierSelect}
        updateSupplier={updateSupplier}
        isUpdatingSupplier={isUpdatingSupplier}
        deleteSupplier={deleteSupplier}
        isDeletingSupplier={isDeletingSupplier}
      />
    </div>
  );
};

export default SuppliersOverview;
