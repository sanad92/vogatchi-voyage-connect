
import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WhatsAppMessage } from '@/types/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MessagesListProps {
  messages: WhatsAppMessage[];
  loading: boolean;
  conversationId: string;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  loading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'read':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'مُرسل';
      case 'delivered':
        return 'تم التوصيل';
      case 'read':
        return 'تمت القراءة';
      case 'failed':
        return 'فشل';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا توجد رسائل
          </h3>
          <p className="text-gray-500">
            ابدأ محادثة بإرسال رسالة جديدة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
        >
          <Card className={`max-w-xs lg:max-w-md ${
            message.direction === 'outbound' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white'
          }`}>
            <CardContent className="p-3">
              <div className="space-y-2">
                {/* Message Content */}
                <div className="break-words">
                  {message.content}
                </div>

                {/* Message Info */}
                <div className={`flex items-center justify-between text-xs ${
                  message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>
                    {formatDistanceToNow(new Date(message.sent_at), {
                      addSuffix: true,
                      locale: ar
                    })}
                  </span>
                  
                  {message.direction === 'outbound' && (
                    <Badge className={`text-xs ${getStatusColor(message.status)}`}>
                      {getStatusText(message.status)}
                    </Badge>
                  )}
                </div>

                {/* Sender Info */}
                {message.sender && (
                  <div className={`text-xs ${
                    message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.sender.full_name}
                  </div>
                )}

                {/* Error Message */}
                {message.status === 'failed' && message.error_message && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    خطأ: {message.error_message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
