
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, User, Clock } from 'lucide-react';
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
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'transferred':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'pending':
        return 'في الانتظار';
      case 'closed':
        return 'مغلق';
      case 'transferred':
        return 'محول';
      default:
        return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'عاجل';
      case 'high':
        return 'عالي';
      case 'normal':
        return 'عادي';
      case 'low':
        return 'منخفض';
      default:
        return priority;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <p className="text-gray-500">سيتم عرض المحادثات هنا عند وصول رسائل جديدة</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`cursor-pointer transition-colors hover:bg-gray-50 ${
            selectedId === conversation.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">
                  {conversation.phone_number}
                </span>
              </div>
              <div className="flex gap-1">
                <Badge className={`text-xs ${getStatusColor(conversation.status)}`}>
                  {getStatusText(conversation.status)}
                </Badge>
                <Badge className={`text-xs ${getPriorityColor(conversation.priority)}`}>
                  {getPriorityText(conversation.priority)}
                </Badge>
              </div>
            </div>

            {conversation.customer && (
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3 h-3 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {conversation.customer.name}
                </span>
              </div>
            )}

            {conversation.assigned_employee && (
              <div className="text-xs text-gray-500 mb-2">
                مُكلف: {conversation.assigned_employee.full_name}
              </div>
            )}

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
              {conversation.auto_assigned && (
                <Badge variant="outline" className="text-xs">
                  تلقائي
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
