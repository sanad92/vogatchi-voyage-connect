
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/userManagement";
import UserActionButtons from "./UserActionButtons";
import { format } from "date-fns";

interface UserTableProps {
  users: User[];
  onUpdate: () => void;
}

const UserTable = ({ users, onUpdate }: UserTableProps) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales_agent': return 'bg-green-100 text-green-800 border-green-200';
      case 'accountant': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      case 'viewer': return 'مشاهد';
      default: return 'بدون دور';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستخدم</TableHead>
            <TableHead>القسم</TableHead>
            <TableHead>الدور</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  {user.phone && (
                    <div className="text-xs text-gray-400">{user.phone}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{user.department || 'غير محدد'}</span>
              </TableCell>
              <TableCell>
                <Badge className={getRoleBadgeColor(user.role || 'no_role')}>
                  {getRoleLabel(user.role || 'no_role')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? 'نشط' : 'معطل'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {format(new Date(user.created_at), 'dd/MM/yyyy')}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <UserActionButtons user={user} onUpdate={onUpdate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
