
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Users, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';

interface UnifiedFiltersEnhancedProps {
  searchTerm: string;
  selectedRole: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  totalResults?: number;
}

const UnifiedFiltersEnhanced = ({ 
  searchTerm, 
  selectedRole, 
  onSearchChange, 
  onRoleChange,
  totalResults = 0
}: UnifiedFiltersEnhancedProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const roles = [
    { value: 'all', label: 'جميع الأدوار', icon: Users, color: 'bg-gray-500' },
    { value: 'super_admin', label: 'سوبر أدمن', icon: UserCheck, color: 'bg-red-500' },
    { value: 'admin', label: 'أدمن', icon: UserCheck, color: 'bg-purple-500' },
    { value: 'manager', label: 'مدير', icon: UserCheck, color: 'bg-blue-500' },
    { value: 'sales_agent', label: 'مندوب مبيعات', icon: UserCheck, color: 'bg-green-500' },
    { value: 'accountant', label: 'محاسب', icon: UserCheck, color: 'bg-yellow-500' },
    { value: 'viewer', label: 'مشاهد', icon: UserCheck, color: 'bg-gray-500' },
    { value: 'no_role', label: 'بدون دور', icon: UserX, color: 'bg-orange-500' }
  ];

  const activeFiltersCount = (selectedRole !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
  const selectedRoleData = roles.find(role => role.value === selectedRole);

  const clearFilters = () => {
    onSearchChange('');
    onRoleChange('all');
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search and Filter Toggle */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المستخدمين والموظفين... (الاسم، الإيميل، كود الموظف)"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200"
              />
              {searchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-12 px-6 transition-all duration-200 ${
                activeFiltersCount > 0 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <Badge className="mr-2 bg-blue-500 text-white px-2 py-1 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {isFilterOpen && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Role Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">تصفية حسب الدور</h3>
                  {activeFiltersCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3 mr-1" />
                      مسح الكل
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {roles.map((role) => (
                    <Button
                      key={role.value}
                      variant={selectedRole === role.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onRoleChange(role.value)}
                      className={`justify-start gap-2 transition-all duration-200 ${
                        selectedRole === role.value
                          ? `${role.color} text-white shadow-md hover:shadow-lg`
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <role.icon className="h-3 w-3" />
                      <span className="text-xs">{role.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Filters and Results */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Term Badge */}
              {searchTerm && (
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300">
                  <Search className="h-3 w-3 mr-1" />
                  {searchTerm}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSearchChange('')}
                    className="ml-1 h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-800"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
              
              {/* Role Filter Badge */}
              {selectedRole !== 'all' && selectedRoleData && (
                <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-600 dark:text-purple-300">
                  <selectedRoleData.icon className="h-3 w-3 mr-1" />
                  {selectedRoleData.label}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRoleChange('all')}
                    className="ml-1 h-4 w-4 p-0 hover:bg-purple-100 dark:hover:bg-purple-800"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">{totalResults}</span> نتيجة
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedFiltersEnhanced;
