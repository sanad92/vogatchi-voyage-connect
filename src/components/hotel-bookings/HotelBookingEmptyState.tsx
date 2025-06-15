
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, Plus, Search } from "lucide-react";

interface HotelBookingEmptyStateProps {
  onCreateNew: () => void;
  isSearching?: boolean;
  onClearSearch?: () => void;
}

const HotelBookingEmptyState = ({ 
  onCreateNew, 
  isSearching = false, 
  onClearSearch 
}: HotelBookingEmptyStateProps) => {
  if (isSearching) {
    return (
      <Card className="p-8">
        <CardContent className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              لا توجد نتائج للبحث
            </h3>
            <p className="text-gray-500 mb-4">
              لم نتمكن من العثور على حجوزات تطابق معايير البحث الخاصة بك
            </p>
            <div className="flex gap-2 justify-center">
              {onClearSearch && (
                <Button variant="outline" onClick={onClearSearch}>
                  مسح البحث
                </Button>
              )}
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                حجز جديد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <CardContent className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
          <Hotel className="h-10 w-10 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            لا توجد حجوزات فنادق بعد
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            ابدأ بإنشاء أول حجز فندق لعملائك. يمكنك إدارة جميع الحجوزات والمتابعة مع العملاء من هنا.
          </p>
          <div className="space-y-3">
            <Button onClick={onCreateNew} size="lg" className="px-8">
              <Plus className="h-5 w-5 mr-2" />
              إنشاء حجز فندق جديد
            </Button>
            <div className="text-sm text-gray-400">
              أو يمكنك استيراد الحجوزات الموجودة من ملف Excel
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HotelBookingEmptyState;
