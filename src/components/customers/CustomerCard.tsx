
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, Star, TrendingUp } from "lucide-react";
import CustomerSegmentBadge from "@/components/crm/CustomerSegmentBadge";
import { useCRM } from "@/hooks/useCRM";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_bookings?: number;
  total_spent?: number;
  loyalty_points?: number;
  last_booking_date?: string;
  segment_id?: string;
}

interface CustomerCardProps {
  customer: Customer;
  onSelect: () => void;
}

const CustomerCard = ({ customer, onSelect }: CustomerCardProps) => {
  const { customerSegments } = useCRM();
  
  const customerSegment = customerSegments?.find(s => s.id === customer.segment_id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لا يوجد';
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{customer.name}</CardTitle>
          <CustomerSegmentBadge segment={customerSegment} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* معلومات الاتصال */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>

        {/* إحصائيات العميل */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-blue-50 rounded text-center">
            <div className="font-semibold text-blue-600">{customer.total_bookings || 0}</div>
            <div className="text-xs text-gray-600">حجوزات</div>
          </div>
          <div className="p-2 bg-green-50 rounded text-center">
            <div className="font-semibold text-green-600">
              {customer.total_spent ? formatCurrency(customer.total_spent).replace('EGP', 'ج.م') : '0 ج.م'}
            </div>
            <div className="text-xs text-gray-600">إجمالي منفق</div>
          </div>
        </div>

        {/* نقاط الولاء */}
        {customer.loyalty_points && customer.loyalty_points > 0 && (
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">نقاط الولاء</span>
            </div>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              {customer.loyalty_points} نقطة
            </Badge>
          </div>
        )}

        {/* آخر حجز */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>آخر حجز: {formatDate(customer.last_booking_date)}</span>
        </div>

        {/* مؤشر النشاط */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">نشط</span>
          </div>
          <Button size="sm" variant="outline">
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
