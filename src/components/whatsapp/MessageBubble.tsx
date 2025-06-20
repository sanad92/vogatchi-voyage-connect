
import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { WhatsAppMessage } from '@/types/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return <p className="whitespace-pre-wrap">{message.content}</p>;
      
      case 'image':
        return (
          <div>
            {message.media_url && (
              <img 
                src={message.media_url} 
                alt="صورة" 
                className="max-w-full rounded-lg mb-2"
                style={{ maxHeight: '300px' }}
              />
            )}
            {message.content && <p>{message.content}</p>}
          </div>
        );
      
      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">📄</span>
            </div>
            <div>
              <p className="text-sm font-medium">مستند</p>
              {message.content && <p className="text-xs text-gray-600">{message.content}</p>}
            </div>
          </div>
        );
      
      case 'template':
        return (
          <div className="border border-green-200 rounded-lg p-3 bg-green-50">
            <div className="text-xs text-green-600 mb-1">قالب رسالة</div>
            <p>{message.content}</p>
          </div>
        );
      
      default:
        return <p>{message.content || `${message.message_type} message`}</p>;
    }
  };

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOutbound ? 'order-1' : 'order-2'}`}>
        <div
          className={`p-3 rounded-lg ${
            isOutbound
              ? 'bg-green-500 text-white rounded-br-sm'
              : 'bg-white border rounded-bl-sm'
          }`}
        >
          {/* Sender name for inbound messages */}
          {!isOutbound && message.sender && (
            <p className="text-xs text-gray-500 mb-1">
              {message.sender.full_name}
            </p>
          )}

          {/* Message content */}
          <div className="text-sm">
            {renderContent()}
          </div>

          {/* Message footer */}
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            isOutbound ? 'justify-end text-green-100' : 'justify-start text-gray-500'
          }`}>
            <span>
              {formatDistanceToNow(new Date(message.sent_at), { 
                addSuffix: true, 
                locale: ar 
              })}
            </span>
            {isOutbound && getStatusIcon()}
          </div>

          {/* Error message */}
          {message.status === 'failed' && message.error_message && (
            <div className="mt-2 text-xs text-red-300 bg-red-600 bg-opacity-20 p-1 rounded">
              خطأ: {message.error_message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
