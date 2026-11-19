
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
import { useHrAccess } from '@/hooks/useHrAccess';

const EmployeeManagement = () => {
  const { canViewFiles, canCreateFiles, canDeleteFiles } = useHrAccess();
  const { 
    allEmployees, 
    stats, 
    unifiedLoading, 
    employeesError,
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

  const onSubmit = (e: React.FormEvent) => {
    handleSubmit(e, newEmployee, validateForm, resetForm, () => setIsAddDialogOpen(false));
  };

  // تحسين عرض رسائل الخطأ
  const renderErrorAlert = () => {
    const errors = [];
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

  if (!canViewFiles) return null;

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
        onAddEmployee={canCreateFiles ? () => setIsAddDialogOpen(true) : undefined}
      />

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة الموظفين
          </TabsTrigger>
          {canDeleteFiles && <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            الموظفون المكررون
          </TabsTrigger>}
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

          {filteredEmployees.length === 0 ? (
            <EmployeeEmptyState
              searchTerm={searchTerm}
              onAddEmployee={canCreateFiles ? () => setIsAddDialogOpen(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

        {canDeleteFiles && <TabsContent value="duplicates"><DuplicateEmployeesManager /></TabsContent>}
      </Tabs>

      {canCreateFiles && <EmployeeFormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        newEmployee={newEmployee}
        setNewEmployee={setNewEmployee}
        onSubmit={onSubmit}
        isAddingEmployee={isAddingEmployee}
      />}
    </div>
  );
};

export default EmployeeManagement;
