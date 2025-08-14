import { useState, useEffect } from 'react';
import { customerService, Customer, CustomerData } from '@/services/customerService';
import { toast } from 'sonner';

export const usePhpCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const fetchCustomers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(params);
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('فشل في تحميل العملاء');
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomer = async (customerData: CustomerData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await customerService.createCustomer(customerData);
      
      if (response.success) {
        toast.success('تم إضافة العميل بنجاح');
        fetchCustomers(); // Refresh the list
        return true;
      } else {
        toast.error('فشل في إضافة العميل');
        return false;
      }
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة العميل');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<CustomerData>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await customerService.updateCustomer(id, customerData);
      
      if (response.success) {
        toast.success('تم تحديث العميل بنجاح');
        fetchCustomers(); // Refresh the list
        return true;
      } else {
        toast.error('فشل في تحديث العميل');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث العميل');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await customerService.deleteCustomer(id);
      
      if (response.success) {
        toast.success('تم حذف العميل بنجاح');
        fetchCustomers(); // Refresh the list
        return true;
      } else {
        toast.error('فشل في حذف العميل');
        return false;
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف العميل');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    isLoading,
    pagination,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};