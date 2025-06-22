
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Paperclip, 
  FileText, 
  Image,
  Zap,
  Smile
} from 'lucide-react';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { useWhatsAppQuickReplies } from '@/hooks/useWhatsAppQuickReplies';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { toast } from 'sonner';

interface WhatsAppMessageComposerProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export const WhatsAppMessageComposer: React.FC<WhatsAppMessageComposerProps> = ({
  conversationId,
  onMessageSent
}) => {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const { sendTextMessage, isSending } = useWhatsAppMessaging();
  const { quickReplies } = useWhatsAppQuickReplies();
  const { templates } = useWhatsAppTemplates();

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    try {
      await sendTextMessage(conversationId, message);
      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
    setShowQuickReplies(false);
  };

  const handleTemplateSelect = (template: any) => {
    setMessage(template.body_text);
    setShowTemplates(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick Replies */}
      {showQuickReplies && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">الردود السريعة</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowQuickReplies(false)}
              >
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {quickReplies?.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-right"
                  onClick={() => handleQuickReplySelect(reply.content)}
                >
                  <div>
                    <div className="font-medium">{reply.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {reply.content.substring(0, 50)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {showTemplates && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">قوالب الرسائل</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {templates?.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-right"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {template.body_text.substring(0, 50)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Composer */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          {/* Action Buttons */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              title="الردود السريعة"
            >
              <Zap className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              title="القوالب"
            >
              <FileText className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              title="إرفاق ملف"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              title="إرفاق صورة"
            >
              <Image className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="h-full min-h-[80px]"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
