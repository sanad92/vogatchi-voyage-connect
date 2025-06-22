
import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Phone, 
  User, 
  Clock,
  CheckCircle2,
  Check
} from 'lucide-react';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WhatsAppConversationViewProps {
  conversation: any;
  onConversationUpdate?: () => void;
}

export const WhatsAppConversationView: React.FC<WhatsAppConversationViewProps> = ({
  conversation,
  onConversationUpdate
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useWhatsAppMessages(conversation?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ar 
    });
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">اختر محادثة</h3>
            <p className="text-gray-500">اختر محادثة من القائمة لبدء المحادثة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Conversation Header */}
      <Card className="rounded-b-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {conversation.customer?.name || conversation.phone_number}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3 h-3" />
                  {conversation.phone_number}
                  {conversation.assigned_employee && (
                    <>
                      <span>•</span>
                      <span>الموظف: {conversation.assigned_employee.full_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                {conversation.status === 'active' ? 'نشط' : 'مغلق'}
              </Badge>
              <Badge variant="outline">
                {conversation.priority === 'high' ? 'عالي' : 
                 conversation.priority === 'urgent' ? 'عاجل' : 'عادي'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'outbound'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {message.media_url && (
                    <div className="mt-2">
                      {message.message_type === 'image' ? (
                        <img 
                          src={message.media_url} 
                          alt="مرفق" 
                          className="max-w-full h-auto rounded"
                        />
                      ) : (
                        <a 
                          href={message.media_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-200 underline"
                        >
                          📎 مرفق
                        </a>
                      )}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                    message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{getMessageTime(message.sent_at)}</span>
                    {message.direction === 'outbound' && getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Composer */}
      <Card className="rounded-t-none border-t">
        <CardContent className="p-4">
          <WhatsAppMessageComposer
            conversationId={conversation.id}
            onMessageSent={() => {
              onConversationUpdate?.();
              scrollToBottom();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
