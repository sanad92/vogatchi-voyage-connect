
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Paperclip, 
  FileText, 
  Image,
  Zap
} from 'lucide-react';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
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
  const [showQuickReplies] = useState(false);
  const [showTemplates] = useState(false);
  
  const { sendTextMessage, isSending } = useWhatsAppMessaging();

  // Mock data for quick replies and templates (since hooks are causing issues)
  const quickReplies: Array<{ id: string; title: string; content: string }> = [];
  const templates: Array<{ id: string; title: string; content: string }> = [];

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
  };

  return (
    <div className="space-y-4">
      {/* Quick Replies */}
      {showQuickReplies && quickReplies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">الردود السريعة</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => handleQuickReplySelect(reply.content)}
                >
                  {reply.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {showTemplates && templates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">قوالب الرسائل</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => handleQuickReplySelect(template.content)}
                >
                  {template.title}
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
              title="الردود السريعة"
            >
              <Zap className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
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
