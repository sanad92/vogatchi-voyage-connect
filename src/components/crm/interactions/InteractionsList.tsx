
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Mail, Calendar, User, Clock } from 'lucide-react';

interface InteractionsListProps {
  interactions: any[];
  onNewInteraction: () => void;
}

const InteractionsList = ({ interactions, onNewInteraction }: InteractionsListProps) => {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            سجل التفاعلات
          </CardTitle>
          <Button onClick={onNewInteraction}>
            تسجيل تفاعل جديد
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <div key={interaction.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {getInteractionIcon(interaction.communication_type)}
                    <span className="font-medium">
                      {interaction.communication_type === 'phone' ? 'مكالمة هاتفية' :
                       interaction.communication_type === 'email' ? 'بريد إلكتروني' :
                       interaction.communication_type === 'whatsapp' ? 'واتساب' : 'أخرى'}
                    </span>
                  </div>
                  <Badge variant={getStatusColor(interaction.status)}>
                    {interaction.status === 'completed' ? 'مكتمل' :
                     interaction.status === 'pending' ? 'قيد الانتظار' :
                     interaction.status === 'scheduled' ? 'مجدول' : interaction.status}
                  </Badge>
                </div>
                
                <div className="text-left text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(interaction.created_at).toLocaleDateString('ar-EG')}
                  </div>
                  {interaction.duration_minutes && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {interaction.duration_minutes} دقيقة
                    </div>
                  )}
                </div>
              </div>
              
              {interaction.content && (
                <div className="mt-3 text-sm">
                  <p className="text-gray-700">{interaction.content}</p>
                </div>
              )}
              
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <User className="h-3 w-3" />
                <span>بواسطة: {interaction.handled_by_profile?.full_name || 'غير محدد'}</span>
                {interaction.direction === 'outbound' && (
                  <Badge variant="outline" className="text-xs">صادر</Badge>
                )}
                {interaction.direction === 'inbound' && (
                  <Badge variant="outline" className="text-xs">وارد</Badge>
                )}
              </div>
            </div>
          ))}
          
          {interactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد تفاعلات مسجلة
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractionsList;
