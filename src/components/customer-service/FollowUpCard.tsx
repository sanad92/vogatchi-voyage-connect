
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Phone, MessageSquare, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface FollowUpCardProps {
  followUp: any;
  onUpdate: (id: string, updates: any) => void;
  onCommunicate: (data: any) => void;
}

const FollowUpCard = ({ followUp, onUpdate, onCommunicate }: FollowUpCardProps) => {
  const { profile } = useAuth();
  const [notes, setNotes] = useState(followUp.notes || '');
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleStatusChange = (newStatus: string) => {
    const updates: any = { status: newStatus };
    
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    
    if (newStatus === 'in_progress' && !followUp.assigned_to) {
      updates.assigned_to = profile?.id;
    }

    onUpdate(followUp.id, updates);
  };

  const handleCommunicate = (type: string) => {
    onCommunicate({
      customer_id: followUp.customer_id,
      booking_id: followUp.booking_id,
      follow_up_id: followUp.id,
      communication_type: type,
      direction: 'outbound',
      status: 'scheduled',
      handled_by: profile?.id
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {followUp.customers?.name}
          </CardTitle>
          <Badge className={getStatusColor(followUp.status)}>
            {followUp.status === 'pending' && 'في الانتظار'}
            {followUp.status === 'in_progress' && 'قيد التنفيذ'}
            {followUp.status === 'completed' && 'مكتملة'}
            {followUp.status === 'skipped' && 'تم تخطيها'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(followUp.scheduled_date).toLocaleDateString('ar-EG')}
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {getFollowUpTypeLabel(followUp.follow_up_type)}
          </div>
          {followUp.bookings?.booking_reference && (
            <div>
              رقم الحجز: {followUp.bookings.booking_reference}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('call')}
              className="flex items-center gap-1"
            >
              <Phone className="h-4 w-4" />
              اتصال
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('whatsapp')}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              واتساب
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">الحالة:</span>
            <Select value={followUp.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="skipped">تخطي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isExpanded && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">ملاحظات:</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات..."
                  className="mt-1"
                />
              </div>
              <Button 
                size="sm"
                onClick={() => onUpdate(followUp.id, { notes })}
              >
                حفظ الملاحظات
              </Button>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowUpCard;
