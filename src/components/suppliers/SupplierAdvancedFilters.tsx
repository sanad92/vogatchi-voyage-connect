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
  // Ensure minRating is number | undefined, never string
  const [filters, setFilters] = useState<{
    type?: string;
    status?: string;
    minRating?: number;
    search?: string;
  }>({
    ...currentFilters,
    type: currentFilters.type ?? 'all',
    status: currentFilters.status ?? 'all',
    minRating: currentFilters.minRating ?? undefined,
    search: currentFilters.search ?? '',
  });

  const handleChange = (key: string, value: string) => {
    let updatedFilters = { ...filters };

    if (key === 'type' || key === 'status') {
      updatedFilters[key] = value === 'all' ? undefined : value;
    } else if (key === 'minRating') {
      // The Select always provides string. Convert to number if possible, else undefined.
      updatedFilters.minRating = value === '' ? undefined : Number(value);
    } else if (key === 'search') {
      updatedFilters.search = value;
    }
    setFilters({
      ...filters,
      ...updatedFilters,
      // For controlled Select: keep string values for type/status in the state if needed for UI
      type: key === 'type' ? value : (filters.type ?? 'all'),
      status: key === 'status' ? value : (filters.status ?? 'all'),
    });
    // Only pass numeric or undefined for minRating:
    const outgoingFilters = {
      ...updatedFilters,
      type: updatedFilters.type ?? undefined,
      status: updatedFilters.status ?? undefined,
      minRating: updatedFilters.minRating,
      search: updatedFilters.search ?? '',
    };
    onFilterChange(outgoingFilters);
  };

  // For the selects: value must be string always.
  const minRatingValue = filters.minRating !== undefined ? String(filters.minRating) : '';

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
        value={minRatingValue}
        onValueChange={v => handleChange('minRating', v)}
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
