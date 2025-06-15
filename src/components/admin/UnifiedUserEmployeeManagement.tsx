
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useUnifiedUserEmployee } from '@/hooks/useUnifiedUserEmployee';
import { useAuth } from '@/hooks/useAuth';
import UnifiedEditDialog from './unified-management/UnifiedEditDialog';
import LinkEmployeeDialog from './unified-management/LinkEmployeeDialog';
import UnifiedStatsHeader from './unified-management/UnifiedStatsHeader';
import UnifiedFilters from './unified-management/UnifiedFilters';
import UnifiedUserCard from './unified-management/UnifiedUserCard';
import UnifiedEmptyState from './unified-management/UnifiedEmptyState';

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
  } = useUnifiedUserEmployee();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ليس لديك صلاحية</h3>
            <p className="text-gray-600">هذه الميزة متاحة للسوبر أدمن فقط</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // فلترة المستخدمين
  const filteredUsers = unifiedUsers?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  }) || [];

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
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل البيانات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <UnifiedStatsHeader
        totalUsers={unifiedUsers?.length || 0}
        linkedUsers={unifiedUsers?.filter(u => u.employee).length || 0}
        unlinkedEmployees={unlinkedEmployees?.length || 0}
      />

      <UnifiedFilters
        searchTerm={searchTerm}
        selectedRole={selectedRole}
        onSearchChange={setSearchTerm}
        onRoleChange={setSelectedRole}
      />

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredUsers.map((user) => (
          <UnifiedUserCard
            key={user.id}
            user={user}
            onEdit={handleEditUser}
            onLink={handleLinkUser}
            onUnlink={unlinkUserFromEmployee}
            isLinking={isLinking}
            isUnlinking={isUnlinking}
          />
        ))}
      </div>

      {filteredUsers.length === 0 && <UnifiedEmptyState />}

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
