
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Phone, MessageSquare, User, AlertCircle, Star, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getFollowUpTypeLabel, getPriorityColor, getCustomerValueColor, getCustomerValueLabel } from '@/types/customerService';

interface FollowUpCardProps {
  followUp: any;
  onUpdate: (id: string, updates: any) => void;
  onCommunicate: (data: any) => void;
}

const FollowUpCard = ({ followUp, onUpdate, onCommunicate }: FollowUpCardProps) => {
  const { profile } = useAuth();
  const [notes, setNotes] = useState(followUp.notes || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      skipped: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <Star className="h-4 w-4 text-orange-600" />;
      default: return null;
    }
  };

  const getCustomerValueIcon = (value: string) => {
    if (value === 'vip') return <Crown className="h-4 w-4 text-purple-600" />;
    return null;
  };

  const isOverdue = () => {
    if (followUp.status === 'completed') return false;
    return new Date(followUp.scheduled_date) < new Date();
  };

  const getLastContactInfo = () => {
    if (followUp.last_contact_date) {
      const daysDiff = Math.floor((new Date().getTime() - new Date(followUp.last_contact_date).getTime()) / (1000 * 3600 * 24));
      return `آخر تواصل: منذ ${daysDiff} يوم`;
    }
    return 'لم يتم التواصل بعد';
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

  const handlePriorityChange = (newPriority: string) => {
    onUpdate(followUp.id, { priority: newPriority });
  };

  const handleCommunicate = (type: string) => {
    const communicationData = {
      customer_id: followUp.customer_id,
      booking_id: followUp.booking_id,
      follow_up_id: followUp.id,
      communication_type: type,
      direction: 'outbound',
      status: 'scheduled',
      handled_by: profile?.id
    };

    onCommunicate(communicationData);

    // تحديث آخر تاريخ تواصل
    onUpdate(followUp.id, { 
      last_contact_date: new Date().toISOString(),
      status: followUp.status === 'pending' ? 'in_progress' : followUp.status
    });
  };

  return (
    <Card className={`mb-4 ${isOverdue() ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {followUp.customers?.name}
            {getCustomerValueIcon(followUp.customer_value)}
            {followUp.customer_value && (
              <Badge className={getCustomerValueColor(followUp.customer_value)}>
                {getCustomerValueLabel(followUp.customer_value)}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getPriorityIcon(followUp.priority)}
            <Badge className={getStatusColor(followUp.status)}>
              {followUp.status === 'pending' && 'في الانتظار'}
              {followUp.status === 'in_progress' && 'قيد التنفيذ'}
              {followUp.status === 'completed' && 'مكتملة'}
              {followUp.status === 'skipped' && 'تم تخطيها'}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(followUp.scheduled_date).toLocaleDateString('ar-EG')}
              {isOverdue() && <span className="text-red-600 font-medium">(متأخر)</span>}
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {getFollowUpTypeLabel(followUp.follow_up_type)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            {followUp.bookings?.booking_reference && (
              <div>رقم الحجز: {followUp.bookings.booking_reference}</div>
            )}
            <div>{getLastContactInfo()}</div>
          </div>

          {/* معلومات الاتصال */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {followUp.customers?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {followUp.customers.phone}
              </div>
            )}
            {followUp.customers?.email && (
              <div>{followUp.customers.email}</div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* أزرار التواصل */}
          <div className="flex flex-wrap gap-2">
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleCommunicate('email')}
              className="flex items-center gap-1"
            >
              بريد إلكتروني
            </Button>
          </div>

          {/* الحالة والأولوية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الحالة:</label>
              <Select value={followUp.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
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

            <div>
              <label className="text-sm font-medium mb-2 block">الأولوية:</label>
              <Select value={followUp.priority || 'normal'} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">مهم</SelectItem>
                  <SelectItem value="normal">عادي</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* الأولوية */}
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(followUp.priority || 'normal')}>
              {followUp.priority === 'urgent' && 'عاجل'}
              {followUp.priority === 'high' && 'مهم'}
              {followUp.priority === 'normal' && 'عادي'}
              {followUp.priority === 'low' && 'منخفض'}
              {!followUp.priority && 'عادي'}
            </Badge>
          </div>

          {isExpanded && (
            <div className="space-y-3 pt-3 border-t">
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

              {/* معلومات إضافية */}
              <div className="text-sm text-gray-600 space-y-1">
                <div>تم الإنشاء: {new Date(followUp.created_at).toLocaleDateString('ar-EG')}</div>
                {followUp.assigned_to_profile?.full_name && (
                  <div>مُكلف: {followUp.assigned_to_profile.full_name}</div>
                )}
                {followUp.completed_at && (
                  <div>تم الإنجاز: {new Date(followUp.completed_at).toLocaleDateString('ar-EG')}</div>
                )}
              </div>
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
