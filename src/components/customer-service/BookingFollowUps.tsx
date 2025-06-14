
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { useCustomerService } from '@/hooks/useCustomerService';

interface BookingFollowUpsProps {
  customerId: string;
  bookings?: any[];
}

const BookingFollowUps = ({ customerId, bookings = [] }: BookingFollowUpsProps) => {
  const { updateFollowUp } = useCustomerService();

  const getFollowUpTypeLabel = (type: string) => {
    const labels = {
      'pre_arrival_2days': 'قبل الوصول بيومين',
      'pre_arrival_1day': 'قبل الوصول بيوم',
      'arrival_day': 'يوم الوصول',
      'post_checkout': 'بعد المغادرة'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      skipped: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          مهام المتابعة للحجوزات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            لا توجد حجوزات لهذا العميل
          </p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">حجز رقم: {booking.booking_reference}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.check_in_date).toLocaleDateString('ar-EG')} - 
                      {new Date(booking.check_out_date).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <Badge variant="outline">{booking.status}</Badge>
                </div>

                {/* مهام المتابعة للحجز */}
                {booking.follow_ups && booking.follow_ups.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">مهام المتابعة:</h5>
                    {booking.follow_ups.map((followUp: any) => (
                      <div key={followUp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(followUp.status)}
                          <span className="text-sm">
                            {getFollowUpTypeLabel(followUp.follow_up_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({new Date(followUp.scheduled_date).toLocaleDateString('ar-EG')})
                          </span>
                        </div>
                        <Badge className={getStatusColor(followUp.status)}>
                          {followUp.status === 'pending' && 'في الانتظار'}
                          {followUp.status === 'in_progress' && 'قيد التنفيذ'}
                          {followUp.status === 'completed' && 'مكتملة'}
                          {followUp.status === 'skipped' && 'تم تخطيها'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* إحصائيات سريعة */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {booking.follow_ups?.filter((f: any) => f.status === 'pending').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">في الانتظار</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {booking.follow_ups?.filter((f: any) => f.status === 'in_progress').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">قيد التنفيذ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {booking.follow_ups?.filter((f: any) => f.status === 'completed').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">مكتملة</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingFollowUps;
