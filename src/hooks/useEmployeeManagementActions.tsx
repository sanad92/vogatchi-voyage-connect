
import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';
import { toast } from 'sonner';

export const useEmployeeManagementActions = (onRefreshData: () => Promise<void>) => {
  const { addEmployee, isAddingEmployee } = useEmployees();
  const { linkUserToEmployee } = useUserEmployeeMapping();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = async (e: React.FormEvent, newEmployee: any, validateForm: () => boolean, resetForm: () => void, closeDialog: () => void) => {
    e.preventDefault();
    
    console.log('📝 بدء عملية إضافة موظف محسنة...');
    
    if (!validateForm()) {
      console.log('❌ النموذج غير صحيح');
      return;
    }

    try {
      console.log('🚀 إضافة الموظف...', newEmployee);
      
      await addEmployee(newEmployee);
      
      console.log('✅ تم إضافة الموظف بنجاح');
      
      setTimeout(async () => {
        console.log('🔄 تحديث البيانات الموحدة...');
        await handleRefreshData();
      }, 1000);
      
      closeDialog();
      resetForm();
      
    } catch (error) {
      console.error('❌ خطأ في إضافة الموظف:', error);
      toast.error('حدث خطأ أثناء إضافة الموظف');
    }
  };

  const handleLinkEmployee = async (employeeId: string) => {
    console.log('🔗 بدء ربط الموظف:', employeeId);
    
    try {
      const success = await linkUserToEmployee(employeeId);
      if (success) {
        console.log('✅ تم ربط الموظف بنجاح');
        
        setTimeout(async () => {
          await handleRefreshData();
        }, 1000);
        
        toast.success('تم ربط الموظف بالمستخدم بنجاح');
      }
    } catch (error) {
      console.error('❌ خطأ في ربط الموظف:', error);
      toast.error('حدث خطأ أثناء ربط الموظف');
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 تحديث جميع البيانات المحسنة...');
      await onRefreshData();
      console.log('✅ تم تحديث البيانات بنجاح');
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    handleSubmit,
    handleLinkEmployee,
    handleRefreshData,
    isRefreshing,
    isAddingEmployee
  };
};
