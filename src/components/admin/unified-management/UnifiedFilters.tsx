
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UnifiedFiltersProps {
  searchTerm: string;
  selectedRole: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}

const UnifiedFilters = ({ 
  searchTerm, 
  selectedRole, 
  onSearchChange, 
  onRoleChange 
}: UnifiedFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث في المستخدمين والموظفين..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الأدوار</option>
            <option value="super_admin">سوبر أدمن</option>
            <option value="admin">أدمن</option>
            <option value="manager">مدير</option>
            <option value="sales_agent">مندوب مبيعات</option>
            <option value="accountant">محاسب</option>
            <option value="viewer">مشاهد</option>
            <option value="no_role">بدون دور</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedFilters;
