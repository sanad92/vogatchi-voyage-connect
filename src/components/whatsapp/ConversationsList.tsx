
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Clock, User } from 'lucide-react';
import { WhatsAppConversation } from '@/types/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'orange';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-full overflow-y-auto">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
            selectedId === conversation.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-green-100 text-green-700">
                  {conversation.customer?.name?.charAt(0) || 
                   conversation.phone_number.slice(-2)}
                </AvatarFallback>
              </Avatar>
              <div 
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm truncate">
                  {conversation.customer?.name || 'عميل جديد'}
                </h4>
                <Badge variant={getPriorityColor(conversation.priority)} className="text-xs">
                  {conversation.priority === 'urgent' && 'عاجل'}
                  {conversation.priority === 'high' && 'مرتفع'}
                  {conversation.priority === 'normal' && 'عادي'}
                  {conversation.priority === 'low' && 'منخفض'}
                </Badge>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                <Phone className="w-3 h-3" />
                <span>{conversation.phone_number}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(conversation.last_message_at), { 
                      addSuffix: true, 
                      locale: ar 
                    })}
                  </span>
                </div>

                {conversation.assigned_employee && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-16">
                      {conversation.assigned_employee.full_name}
                    </span>
                  </div>
                )}
              </div>

              {conversation.auto_assigned && (
                <Badge variant="outline" className="text-xs mt-1">
                  توزيع تلقائي
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}

      {conversations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>لا توجد محادثات حالياً</p>
        </div>
      )}
    </div>
  );
};
