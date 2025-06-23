
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Phone, User, MessageCircle } from 'lucide-react';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { MessagesList } from './MessagesList';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChatWindowProps {
  conversationId: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onClose
}) => {
  const { messages, isLoading: messagesLoading } = useWhatsAppMessages(conversationId);

  // جلب تفاصيل المحادثة
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['whatsapp-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(name, email, phone),
          assigned_employee:employees(full_name, employee_code)
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('خطأ في جلب تفاصيل المحادثة:', error);
        throw error;
      }

      return data;
    },
    enabled: !!conversationId
  });

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

  if (conversationLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            المحادثة غير موجودة
          </h3>
          <p className="text-gray-500">
            لم يتم العثور على المحادثة المطلوبة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-none border-l-0 border-r-0 border-t-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                {conversation.phone_number}
                <Badge className={`text-xs ${getStatusColor(conversation.status)}`}>
                  {getStatusText(conversation.status)}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {conversation.customer && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{conversation.customer.name}</span>
                    {conversation.customer.email && (
                      <span className="text-gray-500">({conversation.customer.email})</span>
                    )}
                  </div>
                )}
                
                {conversation.assigned_employee && (
                  <div className="text-gray-500">
                    مُكلف: {conversation.assigned_employee.full_name}
                  </div>
                )}
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessagesList
          messages={messages || []}
          loading={messagesLoading}
          conversationId={conversationId}
        />
      </div>

      {/* Message Composer */}
      <Card className="rounded-none border-l-0 border-r-0 border-b-0">
        <CardContent className="p-4">
          <WhatsAppMessageComposer
            conversationId={conversationId}
            onMessageSent={() => {
              // يمكن إضافة منطق إضافي هنا
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
