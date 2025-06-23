
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Clock } from 'lucide-react';
import { WhatsAppConversation } from '@/types/whatsapp';

interface ConversationsListProps {
  conversations: WhatsAppConversation[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelect
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', className: 'bg-green-100 text-green-800' },
      pending: { label: 'في الانتظار', className: 'bg-yellow-100 text-yellow-800' },
      closed: { label: 'مغلق', className: 'bg-gray-100 text-gray-800' },
      transferred: { label: 'محول', className: 'bg-blue-100 text-blue-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'منخفض', className: 'bg-gray-100 text-gray-800' },
      normal: { label: 'عادي', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'عالي', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'عاجل', className: 'bg-red-100 text-red-800' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد محادثات</h3>
        <p className="text-gray-500">لم يتم العثور على محادثات WhatsApp</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Card 
          key={conversation.id}
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            selectedId === conversation.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">
                  {conversation.customer?.name || conversation.phone_number}
                </span>
              </div>
              {getStatusBadge(conversation.status)}
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              {conversation.phone_number}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getPriorityBadge(conversation.priority)}
                {conversation.assigned_employee && (
                  <Badge variant="outline">
                    {conversation.assigned_employee.full_name}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(conversation.last_message_at).toLocaleString('ar-EG')}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
