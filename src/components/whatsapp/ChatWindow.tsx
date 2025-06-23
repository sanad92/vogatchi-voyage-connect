
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Phone, User } from 'lucide-react';
import { WhatsAppMessageComposer } from './WhatsAppMessageComposer';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';

interface ChatWindowProps {
  conversationId: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onClose
}) => {
  const { messages, isLoading } = useWhatsAppMessages(conversationId);

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            نافذة المحادثة
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">جاري تحميل الرسائل...</p>
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'outbound'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {new Date(message.sent_at).toLocaleTimeString('ar-EG')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد رسائل في هذه المحادثة</p>
            </div>
          )}
        </div>
        
        <div className="border-t p-4">
          <WhatsAppMessageComposer 
            conversationId={conversationId}
            onMessageSent={() => {
              // تحديث الرسائل سيحدث تلقائياً عبر useWhatsAppMessages
            }}
          />
        </div>
      </CardContent>
    </div>
  );
};
