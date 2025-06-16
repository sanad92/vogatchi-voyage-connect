
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, RefreshCw, UserCheck, UserX, Users } from 'lucide-react';

interface EnhancedEmployeeFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  linkedFilter: 'all' | 'linked' | 'unlinked';
  onLinkedFilterChange: (value: 'all' | 'linked' | 'unlinked') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalEmployees: number;
  filteredEmployees: number;
}

const EnhancedEmployeeFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  linkedFilter,
  onLinkedFilterChange,
  onRefresh,
  isRefreshing,
  totalEmployees,
  filteredEmployees
}: EnhancedEmployeeFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* شريط البحث */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث عن موظف (الاسم، رقم الموظف، المنصب)..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* فلتر الحالة */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                جميع الموظفين
              </div>
            </SelectItem>
            <SelectItem value="active">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                الموظفين النشطين
              </div>
            </SelectItem>
            <SelectItem value="inactive">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                الموظفين المعطلين
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* فلتر الربط */}
        <Select value={linkedFilter} onValueChange={onLinkedFilterChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            <SelectItem value="linked">مرتبطين بمستخدمين</SelectItem>
            <SelectItem value="unlinked">غير مرتبطين</SelectItem>
          </SelectContent>
        </Select>

        {/* زر التحديث */}
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* معلومات النتائج */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>
            عرض {filteredEmployees} من أصل {totalEmployees} موظف
          </span>
        </div>
        
        {(searchTerm || statusFilter !== 'all' || linkedFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onStatusFilterChange('all');
              onLinkedFilterChange('all');
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            مسح الفلاتر
          </Button>
        )}
      </div>
    </div>
  );
};

export default EnhancedEmployeeFilters;
