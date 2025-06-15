
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// Avoid empty value string in Radix SelectItem (use "all" for default/all)
const typesOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'hotel', label: 'فنادق' },
  { value: 'airline', label: 'طيران' },
  { value: 'transport', label: 'نقل' },
  { value: 'tour', label: 'جولات' },
];

const statusOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

interface SupplierAdvancedFiltersProps {
  onFilterChange: (filters: {
    type?: string;
    status?: string;
    minRating?: number;
    search?: string;
  }) => void;
  currentFilters: {
    type?: string;
    status?: string;
    minRating?: number;
    search?: string;
  };
}

const SupplierAdvancedFilters = ({
  onFilterChange,
  currentFilters,
}: SupplierAdvancedFiltersProps) => {
  // Default filter values should use "all" instead of empty string
  const [filters, setFilters] = useState({
    ...currentFilters,
    type: currentFilters.type ?? 'all',
    status: currentFilters.status ?? 'all',
    minRating: currentFilters.minRating ?? '',
    search: currentFilters.search ?? '',
  });

  const handleChange = (key: string, value: any) => {
    const updatedFilters = {
      ...filters,
      [key]: value === 'all' ? undefined : value,
    };
    setFilters({ ...updatedFilters, [key]: value }); // keep value for controlled Select
    onFilterChange(updatedFilters);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center p-2 bg-slate-50 rounded-md mb-3">
      <Input
        type="text"
        placeholder="بحث بالاسم أو المسؤول"
        className="w-40"
        value={filters.search}
        onChange={e => handleChange('search', e.target.value)}
      />
      <Select
        value={filters.type || 'all'}
        onValueChange={v => handleChange('type', v)}
      >
        <SelectTrigger className="w-32">نوع المورد</SelectTrigger>
        <SelectContent>
          {typesOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status || 'all'}
        onValueChange={v => handleChange('status', v)}
      >
        <SelectTrigger className="w-32">الحالة</SelectTrigger>
        <SelectContent>
          {statusOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(filters.minRating ?? '')}
        onValueChange={v => handleChange('minRating', v ? Number(v) : undefined)}
      >
        <SelectTrigger className="w-32">الحد الأدنى للتقييم</SelectTrigger>
        <SelectContent>
          <SelectItem value="">الكل</SelectItem>
          {[1,2,3,4,5].map(num => (
            <SelectItem key={num} value={String(num)}>{num} نجوم+</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SupplierAdvancedFilters;

