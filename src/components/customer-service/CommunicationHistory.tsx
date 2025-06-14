
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Mail, Calendar, Clock, User } from 'lucide-react';
import { useState } from 'react';

interface CommunicationHistoryProps {
  customerId: string;
  communications?: any[];
}

const CommunicationHistory = ({ customerId, communications = [] }: CommunicationHistoryProps) => {
  const [showAll, setShowAll] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'bg-green-100 text-green-800';
      case 'no_answer': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'successful': return 'نجح';
      case 'no_answer': return 'لا يجيب';
      case 'failed': return 'فشل';
      case 'scheduled': return 'مجدول';
      default: return status;
    }
  };

  const displayedCommunications = showAll ? communications : communications.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          تاريخ التواصل
        </CardTitle>
      </CardHeader>
      <CardContent>
        {communications.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            لا يوجد تاريخ تواصل مع هذا العميل
          </p>
        ) : (
          <div className="space-y-3">
            {displayedCommunications.map((comm: any) => (
              <div key={comm.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {getIcon(comm.communication_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {comm.communication_type === 'call' && 'مكالمة هاتفية'}
                        {comm.communication_type === 'whatsapp' && 'رسالة واتساب'}
                        {comm.communication_type === 'email' && 'رسالة إيميل'}
                        {comm.communication_type === 'sms' && 'رسالة نصية'}
                      </span>
                      <Badge className={getStatusColor(comm.status)}>
                        {getStatusLabel(comm.status)}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comm.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  
                  {comm.content && (
                    <p className="text-sm text-gray-600 mb-2">{comm.content}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {comm.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {comm.duration_minutes} دقيقة
                      </div>
                    )}
                    {comm.handled_by_profile && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {comm.handled_by_profile.full_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {communications.length > 5 && (
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'إخفاء' : `عرض جميع التواصلات (${communications.length})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommunicationHistory;
