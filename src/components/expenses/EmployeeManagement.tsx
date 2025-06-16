
import { useState } from 'react';
import { RefreshCw, AlertCircle, Users, Wifi, WifiOff } from 'lucide-react';
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

  // تحسين عرض رسائل الخطأ
  const renderErrorAlert = () => {
    const errors = [];
    if (usersError) errors.push('خطأ في جلب بيانات المستخدمين');
    if (employeesError) errors.push('خطأ في جلب بيانات الموظفين');
    
    if (errors.length === 0) return null;

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">حدث خطأ في تحميل البيانات:</div>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'جاري المحاولة...' : 'إعادة المحاولة'}
              </Button>
              
              {navigator.onLine ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <Wifi className="h-3 w-3" />
                  متصل بالإنترنت
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <WifiOff className="h-3 w-3" />
                  غير متصل بالإنترنت
                </div>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // عرض رسالة التحميل المحسنة
  if (unifiedLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-gray-600 font-medium">جاري تحميل بيانات الموظفين المحسنة...</p>
            <p className="text-sm text-gray-500">يتم جلب البيانات من الخادم</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* عرض رسائل الخطأ */}
      {renderErrorAlert()}

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
                  <span className="text-green-700">✓ تم إصلاح مشكلة جلب الموظفين غير المرتبطين</span>
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
