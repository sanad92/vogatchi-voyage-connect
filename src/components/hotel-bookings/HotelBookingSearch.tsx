
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DateRange } from "react-day-picker";

interface HotelBookingSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
}

export interface SearchFilters {
  searchTerm: string;
  status: string;
  dateRange: DateRange | undefined;
  minAmount: string;
  maxAmount: string;
}

const HotelBookingSearch = ({ onSearch, onClear }: HotelBookingSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onSearch({
      searchTerm,
      status,
      dateRange,
      minAmount,
      maxAmount
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    setStatus("all");
    setDateRange(undefined);
    setMinAmount("");
    setMaxAmount("");
    setShowAdvanced(false);
    onClear();
  };

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        {/* البحث الأساسي */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث بالاسم، رقم الحجز، اسم الفندق، أو المدينة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="px-6">
            <Search className="h-4 w-4 mr-2" />
            بحث
          </Button>
          <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
            <Filter className="h-4 w-4 mr-2" />
            فلاتر متقدمة
          </Button>
          {(searchTerm || status !== "all" || dateRange || minAmount || maxAmount) && (
            <Button variant="outline" onClick={handleClear}>
              <X className="h-4 w-4 mr-2" />
              مسح
            </Button>
          )}
        </div>

        {/* الفلاتر المتقدمة */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">حالة الحجز</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
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
              <label className="text-sm font-medium mb-2 block">فترة الإقامة</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="اختر التواريخ"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الحد الأدنى للمبلغ</label>
              <Input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الحد الأقصى للمبلغ</label>
              <Input
                type="number"
                placeholder="50000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default HotelBookingSearch;
