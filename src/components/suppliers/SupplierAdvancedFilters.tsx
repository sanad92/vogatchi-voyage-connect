import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// Avoid empty value string in Radix SelectItem (use "all" for default/all)
const typesOptions = [
  { value: 'all', label: 'كل الأنواع' },
  { value: 'hotel', label: 'فنادق' },
  { value: 'airline', label: 'طيران' },
  { value: 'transport', label: 'نقل' },
  { value: 'tour', label: 'جولات' },
];

const statusOptions = [
  { value: 'all', label: 'كل الحالات' },
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
    let updatedFilters = { ...filters, [key]: value };

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
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        type="text"
        placeholder="بحث بالاسم أو بيانات التواصل"
        className="w-60"
        value={filters.search}
        onChange={e => handleChange('search', e.target.value)}
      />
      <Select
        value={filters.type}
        onValueChange={v => handleChange('type', v)}
      >
        <SelectTrigger className="w-32" aria-label="نوع المورد"><SelectValue /></SelectTrigger>
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
        <SelectTrigger className="w-32" aria-label="الحالة"><SelectValue /></SelectTrigger>
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
        <SelectTrigger className="w-40" aria-label="الحد الأدنى للتقييم"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل التقييمات</SelectItem>
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
