
import { useState } from 'react';
import { RefreshCw, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeStatsHeader from './employee-management/EmployeeStatsHeader';
import EnhancedEmployeeFilters from './employee-management/EnhancedEmployeeFilters';
import EnhancedEmployeeCard from './employee-management/enhanced/EnhancedEmployeeCard';
import EmployeeEmptyState from './employee-management/EmployeeEmptyState';
import EmployeeFormDialog from './employee-management/EmployeeFormDialog';
import DuplicateEmployeesManager from './employee-management/DuplicateEmployeesManager';
import { useEmployeeForm } from './employee-management/useEmployeeForm';
import { useEmployeeManagementData } from '@/hooks/useEmployeeManagementData';
import { useEmployeeManagementActions } from '@/hooks/useEmployeeManagementActions';
import { useEmployeeFiltering } from './employee-management/EmployeeManagementFilters';
import { useEmployees } from '@/hooks/useEmployees';

const EmployeeManagement = () => {
  const { employeesError } = useEmployees();
  const { 
    allEmployees, 
    stats, 
    unifiedLoading, 
    usersError, 
    refreshAllData 
  } = useEmployeeManagementData();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  
  const { newEmployee, setNewEmployee, resetForm, validateForm } = useEmployeeForm();
  
  const {
    handleSubmit,
    handleLinkEmployee,
    handleRefreshData,
    isRefreshing,
    isAddingEmployee
  } = useEmployeeManagementActions(refreshAllData);

  const { filteredEmployees } = useEmployeeFiltering({
    allEmployees,
    searchTerm,
    statusFilter,
    linkedFilter
  });

  console.log('📊 حالة البيانات الموحدة المحسنة:', {
    unifiedUsers: allEmployees.filter(emp => emp.linkedToUser).length,
    unlinkedEmployees: allEmployees.filter(emp => !emp.linkedToUser).length,
    unifiedLoading,
    isRefreshing,
    usersError,
    employeesError
  });

  const onSubmit = (e: React.FormEvent) => {
    handleSubmit(e, newEmployee, validateForm, resetForm, () => setIsAddDialogOpen(false));
  };

  // عرض رسالة الخطأ إذا كان هناك خطأ في البيانات
  if (usersError || employeesError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                إعادة المحاولة
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // عرض رسالة التحميل
  if (unifiedLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الموظفين المحسنة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeStatsHeader
        linkedEmployeesCount={stats.linked}
        unlinkedEmployeesCount={stats.unlinked}
        isRefreshing={isRefreshing}
        unifiedLoading={unifiedLoading}
        onRefresh={handleRefreshData}
        onAddEmployee={() => setIsAddDialogOpen(true)}
      />

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة الموظفين
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            الموظفين المكررين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <EnhancedEmployeeFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            linkedFilter={linkedFilter}
            onLinkedFilterChange={setLinkedFilter}
            onRefresh={handleRefreshData}
            isRefreshing={isRefreshing}
            totalEmployees={allEmployees.length}
            filteredEmployees={filteredEmployees.length}
          />

          {/* معلومات النظام المحسن */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  [نظام محسن] إجمالي: {stats.total} | 
                  نشط: {stats.active} | 
                  معطل: {stats.inactive} | 
                  مرتبط: {stats.linked} | 
                  غير مرتبط: {stats.unlinked} |
                  مفلتر: {filteredEmployees.length} |
                  <span className="text-green-700">✓ تم إضافة إدارة الحالة والحذف</span>
                </span>
              </div>
            </div>
          )}

          {filteredEmployees.length === 0 ? (
            <EmployeeEmptyState
              searchTerm={searchTerm}
              onAddEmployee={() => setIsAddDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <EnhancedEmployeeCard
                  key={employee.id}
                  employee={employee}
                  onLinkEmployee={handleLinkEmployee}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duplicates">
          <DuplicateEmployeesManager />
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        newEmployee={newEmployee}
        setNewEmployee={setNewEmployee}
        onSubmit={onSubmit}
        isAddingEmployee={isAddingEmployee}
      />
    </div>
  );
};

export default EmployeeManagement;
