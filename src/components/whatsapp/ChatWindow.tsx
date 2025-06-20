
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  X, 
  Phone, 
  User, 
  Clock,
  Zap,
  Archive,
  UserPlus
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { QuickRepliesPanel } from './QuickRepliesPanel';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onClose }) => {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentEmployee } = useCurrentEmployee();
  
  const { 
    getConversationMessages, 
    sendMessage, 
    sendMessageLoading, 
    updateConversation,
    conversations 
  } = useWhatsApp();

  const { data: messages, isLoading: messagesLoading } = getConversationMessages(conversationId);
  
  const conversation = conversations?.find(c => c.id === conversationId);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentEmployee) return;

    try {
      await sendMessage({
        conversationId,
        messageType: 'text',
        content: message.trim(),
        sentBy: currentEmployee.id
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
    setShowQuickReplies(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateConversation({
      conversationId,
      updates: { status: newStatus as any }
    });
  };

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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">لم يتم العثور على المحادثة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-medium">
                  {conversation.customer?.name?.charAt(0) || conversation.phone_number.slice(-2)}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium">
                {conversation.customer?.name || 'عميل جديد'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{conversation.phone_number}</span>
                <Badge variant="outline" className="text-xs">
                  {getStatusText(conversation.status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
            >
              <Zap className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    تفعيل المحادثة
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    تعليق المحادثة
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                  <Archive className="w-4 h-4 mr-2" />
                  إغلاق المحادثة
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserPlus className="w-4 h-4 mr-2" />
                  إضافة كعميل
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Quick Replies Panel */}
      {showQuickReplies && (
        <QuickRepliesPanel
          onSelect={handleQuickReplySelect}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {/* Messages Area */}
      <CardContent className="flex-1 p-4 overflow-y-auto">
        {messagesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="min-h-[40px] max-h-32 resize-none"
              disabled={sendMessageLoading}
            />
          </div>

          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageLoading}
            className="px-4"
          >
            {sendMessageLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
