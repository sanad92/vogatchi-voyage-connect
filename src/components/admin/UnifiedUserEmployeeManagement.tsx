
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserPlus, Search } from 'lucide-react';
import { useUnifiedUserFilters } from '@/hooks/useUnifiedUserFilters';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import UnifiedEditDialog from './unified-management/UnifiedEditDialog';
import LinkEmployeeDialog from './unified-management/LinkEmployeeDialog';
import UnifiedStatsHeaderEnhanced from './unified-management/enhanced/UnifiedStatsHeaderEnhanced';
import UnifiedFiltersEnhanced from './unified-management/enhanced/UnifiedFiltersEnhanced';
import UnifiedUserCardEnhanced from './unified-management/enhanced/UnifiedUserCardEnhanced';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state';

const UnifiedUserEmployeeManagement = () => {
  const { isSuperAdmin } = useAuth();
  const {
    unifiedUsers,
    unlinkedEmployees,
    isLoading,
    linkUserToEmployee,
    unlinkUserFromEmployee,
    isLinking,
    isUnlinking,
  } = useUnifiedData();

  const {
    searchTerm,
    selectedRole,
    filteredUsers,
    setSearchTerm,
    setSelectedRole,
  } = useUnifiedUserFilters(unifiedUsers);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <EnhancedEmptyState
        icon={Users}
        title="ليس لديك صلاحية"
        description="هذه الميزة متاحة للسوبر أدمن فقط. يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة."
        variant="error"
      />
    );
  }

  const handleLinkEmployee = (userId: string, employeeId: string) => {
    linkUserToEmployee({ userId, employeeId });
    setIsLinkDialogOpen(false);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleLinkUser = (user: any) => {
    setSelectedUser(user);
    setIsLinkDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <div className="text-center space-y-4">
          <LoadingSkeleton variant="text" className="max-w-md mx-auto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton variant="stat" count={4} />
          </div>
        </div>

        {/* Loading Filters */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <LoadingSkeleton variant="text" />
          </CardContent>
        </Card>

        {/* Loading Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <LoadingSkeleton variant="card" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Stats Header */}
      <UnifiedStatsHeaderEnhanced
        totalUsers={unifiedUsers?.length || 0}
        linkedUsers={unifiedUsers?.filter(u => u.employee).length || 0}
        unlinkedEmployees={unlinkedEmployees?.length || 0}
      />

      {/* Enhanced Filters */}
      <UnifiedFiltersEnhanced
        searchTerm={searchTerm}
        selectedRole={selectedRole}
        onSearchChange={setSearchTerm}
        onRoleChange={setSelectedRole}
        totalResults={filteredUsers.length}
      />

      {/* معلومات الـ unified data */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              [إدارة موحدة] البيانات محدثة ومتزامنة مع جميع الأقسام | 
              المستخدمون: {unifiedUsers?.length || 0} | 
              المرتبطون: {unifiedUsers?.filter(u => u.employee).length || 0} | 
              الموظفون غير المرتبطين: {unlinkedEmployees?.length || 0}
            </span>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="animate-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <UnifiedUserCardEnhanced
                user={user}
                onEdit={handleEditUser}
                onLink={handleLinkUser}
                onUnlink={unlinkUserFromEmployee}
                isLinking={isLinking}
                isUnlinking={isUnlinking}
              />
            </div>
          ))}
        </div>
      ) : (
        <EnhancedEmptyState
          icon={searchTerm || selectedRole !== 'all' ? Search : UserPlus}
          title={
            searchTerm || selectedRole !== 'all' 
              ? 'لا توجد نتائج مطابقة' 
              : 'لا توجد مستخدمين'
          }
          description={
            searchTerm || selectedRole !== 'all'
              ? 'لم يتم العثور على مستخدمين يطابقون معايير البحث والفلاتر المحددة. جرب تعديل البحث أو إزالة بعض الفلاتر.'
              : 'لم يتم إنشاء أي مستخدمين بعد. ابدأ بإضافة مستخدمين جدد لإدارة النظام.'
            }
          variant={searchTerm || selectedRole !== 'all' ? 'search' : 'default'}
          actionLabel={
            searchTerm || selectedRole !== 'all' 
              ? 'مسح الفلاتر' 
              : 'إضافة مستخدم جديد'
          }
          onAction={() => {
            if (searchTerm || selectedRole !== 'all') {
              setSearchTerm('');
              setSelectedRole('all');
            } else {
              // يمكن إضافة وظيفة إضافة مستخدم جديد هنا
              console.log('إضافة مستخدم جديد');
            }
          }}
        />
      )}

      {/* Edit Dialog */}
      {selectedUser && (
        <UnifiedEditDialog
          user={selectedUser}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Link Employee Dialog */}
      {selectedUser && (
        <LinkEmployeeDialog
          user={selectedUser}
          unlinkedEmployees={unlinkedEmployees || []}
          isOpen={isLinkDialogOpen}
          onOpenChange={setIsLinkDialogOpen}
          onLink={handleLinkEmployee}
        />
      )}
    </div>
  );
};

export default UnifiedUserEmployeeManagement;
