
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { WhatsAppMessage } from '@/types/whatsapp';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutgoing = message.direction === 'outbound';
  
  // التأكد من وجود البيانات المطلوبة
  if (!message) {
    return null;
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ar 
      });
    } catch (error) {
      return 'وقت غير محدد';
    }
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2 max-w-xs lg:max-w-md ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOutgoing && (
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
              عميل
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`rounded-lg px-3 py-2 ${
          isOutgoing 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="text-sm">
            {message.content || 'رسالة فارغة'}
          </div>
          
          <div className="flex items-center justify-between mt-1 gap-2">
            <span className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatTime(message.sent_at)}
            </span>
            
            {message.status && (
              <Badge variant="outline" className="text-xs">
                {message.status === 'sent' && 'مرسل'}
                {message.status === 'delivered' && 'تم التسليم'}
                {message.status === 'read' && 'مقروء'}
                {message.status === 'failed' && 'فشل'}
              </Badge>
            )}
          </div>
        </div>
        
        {isOutgoing && (
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {message.sender?.full_name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
};
