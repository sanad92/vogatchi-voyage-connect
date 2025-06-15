
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { getFollowUpTypeLabel } from '@/types/customerService';

interface FilterState {
  type?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  customerValue?: string;
}

interface FollowUpFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  currentFilters: FilterState;
}

const FollowUpFilters = ({ onFiltersChange, currentFilters }: FollowUpFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const followUpTypes = [
    'pre_arrival_2days', 'pre_arrival_1day', 'arrival_day', 'post_checkout',
    'booking_confirmation', 'payment_reminder', 'upsell_opportunity',
    'passport_renewal', 'satisfaction_survey', 'loyalty_offers', 'complaint_followup'
  ];

  const priorities = [
    { value: 'urgent', label: 'عاجل' },
    { value: 'high', label: 'مهم' },
    { value: 'normal', label: 'عادي' },
    { value: 'low', label: 'منخفض' }
  ];

  const statuses = [
    { value: 'pending', label: 'في الانتظار' },
    { value: 'in_progress', label: 'قيد التنفيذ' },
    { value: 'completed', label: 'مكتملة' },
    { value: 'skipped', label: 'تم تخطيها' }
  ];

  const customerValues = [
    { value: 'vip', label: 'VIP' },
    { value: 'regular', label: 'عميل دائم' },
    { value: 'new', label: 'عميل جديد' }
  ];

  const updateFilter = (key: keyof FilterState, value: string | undefined) => {
    const newFilters = { ...currentFilters };
    if (value === 'all' || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.keys(currentFilters).length;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلترة المهام
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'إخفاء' : 'عرض'} الفلاتر
            </Button>
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                مسح الكل
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* نوع المتابعة */}
            <div>
              <label className="text-sm font-medium mb-2 block">نوع المتابعة</label>
              <Select
                value={currentFilters.type || 'all'}
                onValueChange={(value) => updateFilter('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {followUpTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getFollowUpTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الأولوية */}
            <div>
              <label className="text-sm font-medium mb-2 block">الأولوية</label>
              <Select
                value={currentFilters.priority || 'all'}
                onValueChange={(value) => updateFilter('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الحالة */}
            <div>
              <label className="text-sm font-medium mb-2 block">الحالة</label>
              <Select
                value={currentFilters.status || 'all'}
                onValueChange={(value) => updateFilter('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* فئة العميل */}
            <div>
              <label className="text-sm font-medium mb-2 block">فئة العميل</label>
              <Select
                value={currentFilters.customerValue || 'all'}
                onValueChange={(value) => updateFilter('customerValue', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {customerValues.map((value) => (
                    <SelectItem key={value.value} value={value.value}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* الفلاتر النشطة */}
          {getActiveFiltersCount() > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">الفلاتر النشطة:</div>
              <div className="flex flex-wrap gap-2">
                {currentFilters.type && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getFollowUpTypeLabel(currentFilters.type)}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilter('type', undefined)}
                    />
                  </Badge>
                )}
                {currentFilters.priority && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    أولوية: {priorities.find(p => p.value === currentFilters.priority)?.label}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilter('priority', undefined)}
                    />
                  </Badge>
                )}
                {currentFilters.status && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    حالة: {statuses.find(s => s.value === currentFilters.status)?.label}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilter('status', undefined)}
                    />
                  </Badge>
                )}
                {currentFilters.customerValue && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    فئة: {customerValues.find(v => v.value === currentFilters.customerValue)?.label}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilter('customerValue', undefined)}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default FollowUpFilters;
