
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, MessageSquare } from "lucide-react";

interface CustomerCardProps {
  customer: any;
  onServiceClick: (customer: any) => void;
}

const CustomerCard = ({ customer, onServiceClick }: CustomerCardProps) => {
  const getCustomerStats = (customer: any) => {
    const totalBookings = customer.bookings?.length || 0;
    const activeBookings = customer.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
    const pendingFollowUps = customer.follow_ups?.filter((f: any) => f.status === 'pending').length || 0;
    const lastCommunication = customer.communications?.[0]?.created_at;

    return { totalBookings, activeBookings, pendingFollowUps, lastCommunication };
  };

  const stats = getCustomerStats(customer);

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <div className="space-y-1 mt-2">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </div>
              )}
            </div>
          </div>
          {stats.pendingFollowUps > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.pendingFollowUps} مهام عالقة
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* إحصائيات العميل */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{stats.totalBookings}</div>
            <div className="text-xs text-gray-600">إجمالي الحجوزات</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{stats.activeBookings}</div>
            <div className="text-xs text-gray-600">حجوزات نشطة</div>
          </div>
        </div>

        {/* آخر تواصل */}
        {stats.lastCommunication && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            آخر تواصل: {new Date(stats.lastCommunication).toLocaleDateString('ar-EG')}
          </div>
        )}

        {/* أزرار العمليات */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onServiceClick(customer)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            خدمة العملاء
          </Button>
          <Button variant="outline" size="sm">
            تعديل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
