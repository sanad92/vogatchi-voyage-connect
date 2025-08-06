
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, Calendar, DollarSign, Phone, Mail } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

interface CustomerAdvancedSearchProps {
  onSearch: (filters: CustomerSearchFilters) => void;
  onClear: () => void;
}

export interface CustomerSearchFilters {
  searchTerm: string;
  segment: string;
  nationality: string;
  totalBookingsMin: string;
  totalBookingsMax: string;
  totalSpentMin: string;
  totalSpentMax: string;
  lastBookingDateRange: DateRange | undefined;
  registrationDateRange: DateRange | undefined;
  communicationPreference: string;
  hasEmail: boolean | null;
  hasWhatsapp: boolean | null;
}

const CustomerAdvancedSearch = ({ onSearch, onClear }: CustomerAdvancedSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [segment, setSegment] = useState("all");
  const [nationality, setNationality] = useState("all");
  const [totalBookingsMin, setTotalBookingsMin] = useState("");
  const [totalBookingsMax, setTotalBookingsMax] = useState("");
  const [totalSpentMin, setTotalSpentMin] = useState("");
  const [totalSpentMax, setTotalSpentMax] = useState("");
  const [lastBookingDateRange, setLastBookingDateRange] = useState<DateRange | undefined>();
  const [registrationDateRange, setRegistrationDateRange] = useState<DateRange | undefined>();
  const [communicationPreference, setCommunicationPreference] = useState("all");
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [hasWhatsapp, setHasWhatsapp] = useState<boolean | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onSearch({
      searchTerm,
      segment,
      nationality,
      totalBookingsMin,
      totalBookingsMax,
      totalSpentMin,
      totalSpentMax,
      lastBookingDateRange,
      registrationDateRange,
      communicationPreference,
      hasEmail,
      hasWhatsapp
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    setSegment("all");
    setNationality("all");
    setTotalBookingsMin("");
    setTotalBookingsMax("");
    setTotalSpentMin("");
    setTotalSpentMax("");
    setLastBookingDateRange(undefined);
    setRegistrationDateRange(undefined);
    setCommunicationPreference("all");
    setHasEmail(null);
    setHasWhatsapp(null);
    setShowAdvanced(false);
    onClear();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (segment !== "all") count++;
    if (nationality !== "all") count++;
    if (totalBookingsMin || totalBookingsMax) count++;
    if (totalSpentMin || totalSpentMax) count++;
    if (lastBookingDateRange) count++;
    if (registrationDateRange) count++;
    if (communicationPreference !== "all") count++;
    if (hasEmail !== null) count++;
    if (hasWhatsapp !== null) count++;
    return count;
  };

  return (
    <Card className="mb-6 border bg-card rounded-lg shadow-sm">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالاسم، الهاتف، البريد الإلكتروني، أو رقم جواز السفر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex gap-2 md:ml-2">
              <Button onClick={handleSearch} className="px-6 w-full md:w-auto">
                <Search className="h-4 w-4 mr-2" />
                بحث
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="relative w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                فلاتر متقدمة
                {getActiveFiltersCount() > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
              {getActiveFiltersCount() > 0 && (
                <Button variant="outline" onClick={handleClear} className="w-full md:w-auto">
                  <X className="h-4 w-4 mr-2" />
                  مسح
                </Button>
              )}
            </div>
          </div>

          {/* الفلاتر المتقدمة */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* فلتر الشريحة */}
              <div>
                <label className="text-sm font-medium mb-2 block">شريحة العملاء</label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الشرائح" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الشرائح</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="regular">عادي</SelectItem>
                    <SelectItem value="new">جديد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر الجنسية */}
              <div>
                <label className="text-sm font-medium mb-2 block">الجنسية</label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الجنسيات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الجنسيات</SelectItem>
                    <SelectItem value="مصري">مصري</SelectItem>
                    <SelectItem value="سعودي">سعودي</SelectItem>
                    <SelectItem value="إماراتي">إماراتي</SelectItem>
                    <SelectItem value="كويتي">كويتي</SelectItem>
                    <SelectItem value="قطري">قطري</SelectItem>
                    <SelectItem value="أردني">أردني</SelectItem>
                    <SelectItem value="لبناني">لبناني</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* عدد الحجوزات */}
              <div>
                <label className="text-sm font-medium mb-2 block">عدد الحجوزات</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="من"
                    value={totalBookingsMin}
                    onChange={(e) => setTotalBookingsMin(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="إلى"
                    value={totalBookingsMax}
                    onChange={(e) => setTotalBookingsMax(e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>

              {/* إجمالي المبلغ المُنفق */}
              <div>
                <label className="text-sm font-medium mb-2 block">إجمالي الإنفاق (ج.م)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="من"
                    value={totalSpentMin}
                    onChange={(e) => setTotalSpentMin(e.target.value)}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="إلى"
                    value={totalSpentMax}
                    onChange={(e) => setTotalSpentMax(e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>

              {/* تاريخ آخر حجز */}
              <div>
                <label className="text-sm font-medium mb-2 block">تاريخ آخر حجز</label>
                <DatePickerWithRange
                  date={lastBookingDateRange}
                  onDateChange={setLastBookingDateRange}
                  placeholder="اختر التواريخ"
                />
              </div>

              {/* تاريخ التسجيل */}
              <div>
                <label className="text-sm font-medium mb-2 block">تاريخ التسجيل</label>
                <DatePickerWithRange
                  date={registrationDateRange}
                  onDateChange={setRegistrationDateRange}
                  placeholder="اختر التواريخ"
                />
              </div>

              {/* تفضيلات التواصل */}
              <div>
                <label className="text-sm font-medium mb-2 block">تفضيلات التواصل</label>
                <Select value={communicationPreference} onValueChange={setCommunicationPreference}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الطرق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطرق</SelectItem>
                    <SelectItem value="whatsapp">واتساب</SelectItem>
                    <SelectItem value="email">البريد الإلكتروني</SelectItem>
                    <SelectItem value="sms">رسائل نصية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* وجود بريد إلكتروني */}
              <div>
                <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                <div className="flex gap-2">
                  <Button
                    variant={hasEmail === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHasEmail(hasEmail === true ? null : true)}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    متوفر
                  </Button>
                  <Button
                    variant={hasEmail === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHasEmail(hasEmail === false ? null : false)}
                  >
                    غير متوفر
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerAdvancedSearch;
