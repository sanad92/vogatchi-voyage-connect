
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Smile,
  X,
  User,
  Clock
} from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { MessageBubble } from './MessageBubble';
import { QuickRepliesPanel } from './QuickRepliesPanel';
import { WhatsAppMessage } from '@/types/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ChatWindowProps {
  conversationId: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onClose }) => {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getConversationMessages, sendMessage, sendMessageLoading, conversations } = useWhatsApp();
  const { data: messages, isLoading: messagesLoading } = getConversationMessages(conversationId);
  const { currentEmployee } = useCurrentEmployee();

  const conversation = conversations?.find(c => c.id === conversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentEmployee) return;

    sendMessage({
      conversationId,
      messageType: 'text',
      content: message.trim(),
      sentBy: currentEmployee.id
    });

    setMessage('');
  };

  const handleQuickReply = (content: string) => {
    if (!currentEmployee) return;

    sendMessage({
      conversationId,
      messageType: 'text',
      content,
      sentBy: currentEmployee.id
    });

    setShowQuickReplies(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>المحادثة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <Card className="rounded-none border-l-0 border-r-0 border-t-0">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-medium">
                  {conversation.customer?.name?.charAt(0) || 
                   conversation.phone_number.slice(-2)}
                </span>
              </div>
              
              <div>
                <h3 className="font-medium">
                  {conversation.customer?.name || 'عميل جديد'}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3 h-3" />
                  <span>{conversation.phone_number}</span>
                  <Badge variant="outline" className="text-xs">
                    {conversation.status === 'active' && 'نشط'}
                    {conversation.status === 'pending' && 'في الانتظار'}
                    {conversation.status === 'closed' && 'مغلق'}
                    {conversation.status === 'transferred' && 'محول'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {conversation.assigned_employee && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <User className="w-3 h-3" />
                  <span>{conversation.assigned_employee.full_name}</span>
                </div>
              )}
              
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-xs p-3 rounded-lg bg-gray-200 h-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Replies Panel */}
      {showQuickReplies && (
        <QuickRepliesPanel 
          onSelect={handleQuickReply}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {/* Message Input */}
      <Card className="rounded-none border-l-0 border-r-0 border-b-0">
        <CardContent className="p-4">
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className={showQuickReplies ? 'bg-blue-100' : ''}
            >
              <Smile className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm">
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex-1">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك هنا..."
                className="resize-none min-h-[40px]"
                disabled={sendMessageLoading}
              />
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageLoading}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
