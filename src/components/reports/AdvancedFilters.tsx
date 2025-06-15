
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  Filter, 
  X, 
  Search,
  Users,
  Building,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface FilterOptions {
  dateRange: { from: Date | undefined; to: Date | undefined };
  serviceType: string;
  customerSegment: string;
  bookingStatus: string;
  paymentStatus: string;
  minAmount: string;
  maxAmount: string;
  city: string;
  country: string;
  includeRefunds: boolean;
  showOnlyProfit: boolean;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
}

const AdvancedFilters = ({ onFiltersChange }: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: { from: undefined, to: undefined },
    serviceType: "all",
    customerSegment: "all",
    bookingStatus: "all",
    paymentStatus: "all",
    minAmount: "",
    maxAmount: "",
    city: "",
    country: "",
    includeRefunds: true,
    showOnlyProfit: false
  });

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'dateRange') return value.from || value.to;
    if (key === 'includeRefunds' || key === 'showOnlyProfit') return value !== true;
    if (typeof value === 'string') return value !== "" && value !== "all";
    return false;
  }).length;

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      dateRange: { from: undefined, to: undefined },
      serviceType: "all",
      customerSegment: "all",
      bookingStatus: "all",
      paymentStatus: "all",
      minAmount: "",
      maxAmount: "",
      city: "",
      country: "",
      includeRefunds: true,
      showOnlyProfit: false
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر متقدمة
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                مسح الكل
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "إخفاء" : "إظهار"} الفلاتر
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* فلاتر التاريخ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>من تاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      format(filters.dateRange.from, "dd/MM/yyyy", { locale: ar })
                    ) : (
                      "اختر التاريخ"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>إلى تاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      format(filters.dateRange.to, "dd/MM/yyyy", { locale: ar })
                    ) : (
                      "اختر التاريخ"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* فلاتر الخدمات والحالات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>نوع الخدمة</Label>
              <Select value={filters.serviceType} onValueChange={(value) => updateFilter('serviceType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الخدمات</SelectItem>
                  <SelectItem value="hotel">حجز فنادق</SelectItem>
                  <SelectItem value="flight">تذاكر طيران</SelectItem>
                  <SelectItem value="package">باقات سياحية</SelectItem>
                  <SelectItem value="visa">تأشيرات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>حالة الحجز</Label>
              <Select value={filters.bookingStatus} onValueChange={(value) => updateFilter('bookingStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة الحجز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="confirmed">مؤكد</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>حالة الدفع</Label>
              <Select value={filters.paymentStatus} onValueChange={(value) => updateFilter('paymentStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* فلاتر المبالغ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>الحد الأدنى للمبلغ</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => updateFilter('minAmount', e.target.value)}
              />
            </div>
            <div>
              <Label>الحد الأقصى للمبلغ</Label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.maxAmount}
                onChange={(e) => updateFilter('maxAmount', e.target.value)}
              />
            </div>
          </div>

          {/* فلاتر الموقع */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">المدينة</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="city"
                  placeholder="البحث بالمدينة"
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country">البلد</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="country"
                  placeholder="البحث بالبلد"
                  value={filters.country}
                  onChange={(e) => updateFilter('country', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* فلاتر إضافية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="include-refunds"
                checked={filters.includeRefunds}
                onCheckedChange={(checked) => updateFilter('includeRefunds', checked)}
              />
              <Label htmlFor="include-refunds">تضمين المبالغ المستردة</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="show-only-profit"
                checked={filters.showOnlyProfit}
                onCheckedChange={(checked) => updateFilter('showOnlyProfit', checked)}
              />
              <Label htmlFor="show-only-profit">إظهار الأرباح فقط</Label>
            </div>
          </div>

          {/* فلتر تقسيم العملاء */}
          <div>
            <Label>تقسيم العملاء</Label>
            <Select value={filters.customerSegment} onValueChange={(value) => updateFilter('customerSegment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر تقسيم العملاء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العملاء</SelectItem>
                <SelectItem value="vip">عملاء VIP</SelectItem>
                <SelectItem value="premium">عملاء مميزون</SelectItem>
                <SelectItem value="regular">عملاء عاديون</SelectItem>
                <SelectItem value="new">عملاء جدد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilters;
