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
  // Use string for minRating in state always ('all' or '1' ... '5')
  const [filters, setFilters] = useState<{
    type: string;
    status: string;
    minRating: string;
    search: string;
  }>({
    type: currentFilters.type ?? 'all',
    status: currentFilters.status ?? 'all',
    minRating:
      currentFilters.minRating !== undefined
        ? String(currentFilters.minRating)
        : 'all',
    search: currentFilters.search ?? '',
  });

  const handleChange = (key: string, value: string) => {
    const updatedFilters = { ...filters, [key]: value };

    setFilters(updatedFilters);

    // Prepare value types for parent callback
    const outgoingFilters = {
      ...updatedFilters,
      type: updatedFilters.type === 'all' ? undefined : updatedFilters.type,
      status: updatedFilters.status === 'all' ? undefined : updatedFilters.status,
      minRating:
        updatedFilters.minRating === 'all'
          ? undefined
          : Number(updatedFilters.minRating),
      search: updatedFilters.search ?? '',
    };
    onFilterChange(outgoingFilters);
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
        value={filters.type}
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
        value={filters.status}
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
        value={filters.minRating}
        onValueChange={v => handleChange('minRating', v)}
      >
        <SelectTrigger className="w-32">الحد الأدنى للتقييم</SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          {[1, 2, 3, 4, 5].map(num => (
            <SelectItem key={num} value={String(num)}>
              {num} نجوم+
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SupplierAdvancedFilters;
