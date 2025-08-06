
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users } from 'lucide-react';
import { PERMISSION_CATEGORIES } from './PermissionCategories';

interface MatrixSearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredUsersCount: number;
}

const MatrixSearchFilters = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  filteredUsersCount
}: MatrixSearchFiltersProps) => {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث عن مستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="فلترة حسب الفئة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الفئات</SelectItem>
          {PERMISSION_CATEGORIES.map(category => (
            <SelectItem key={category.key} value={category.key}>
              <div className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="outline" className="flex items-center gap-1">
        <Users className="h-4 w-4" />
        {filteredUsersCount} مستخدم
      </Badge>
    </div>
  );
};

export default MatrixSearchFilters;
