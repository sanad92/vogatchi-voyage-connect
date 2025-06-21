
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock } from 'lucide-react';
import { WhatsAppConversation } from '@/types/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ConversationsListProps {
  conversations: WhatsAppConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelect
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      case 'transferred': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'pending': return 'معلقة';
      case 'closed': return 'مغلقة';
      case 'transferred': return 'محولة';
      default: return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner text="جاري تحميل المحادثات..." />
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="text-center p-4 text-gray-500">
        <p>لا توجد محادثات حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`cursor-pointer transition-colors hover:bg-gray-50 ${
            selectedId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-medium text-sm">
                    {conversation.customer?.name?.charAt(0) || conversation.phone_number.slice(-2)}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">
                    {conversation.customer?.name || 'عميل جديد'}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(conversation.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{conversation.phone_number}</span>
                </div>
                
                {conversation.last_message_at && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(conversation.last_message_at), { 
                        addSuffix: true, 
                        locale: ar 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
