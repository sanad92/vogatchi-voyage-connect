
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserSearch from "./user-management/UserSearch";
import CreateUserDialog from "./user-management/CreateUserDialog";
import UserTable from "./user-management/UserTable";
import { User } from "@/types/userManagement";

const UserManagementTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // جلب جميع المستخدمين مع أدوارهم
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `);
      
      if (error) throw error;
      
      return data.map(user => ({
        ...user,
        role: (user.user_roles as any)?.[0]?.role || 'no_role'
      })) as User[];
    }
  });

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل المستخدمين...</div>;
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والإجراءات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <UserSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <CreateUserDialog 
          isOpen={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </div>

      {/* جدول المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={filteredUsers} />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
