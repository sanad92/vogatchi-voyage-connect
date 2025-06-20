
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Zap, Clock } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface QuickRepliesPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export const QuickRepliesPanel: React.FC<QuickRepliesPanelProps> = ({ onSelect, onClose }) => {
  const { quickReplies, quickRepliesLoading } = useWhatsApp();

  // قوالب افتراضية في حالة عدم وجود ردود سريعة
  const defaultReplies = [
    {
      id: 'welcome',
      title: 'ترحيب',
      content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
      category: 'عام',
      usage_count: 0
    },
    {
      id: 'thanks',
      title: 'شكر',
      content: 'شكراً لتواصلك معنا. سنقوم بالرد عليك قريباً.',
      category: 'عام',
      usage_count: 0
    },
    {
      id: 'wait',
      title: 'انتظار',
      content: 'من فضلك انتظر قليلاً، سنقوم بمراجعة طلبك والرد عليك.',
      category: 'خدمة',
      usage_count: 0
    }
  ];

  const repliesToShow = quickReplies && quickReplies.length > 0 ? quickReplies : defaultReplies;

  if (quickRepliesLoading) {
    return (
      <Card className="border-t">
        <CardContent className="p-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            الردود السريعة
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="py-2">
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
          {repliesToShow.map((reply) => (
            <Button
              key={reply.id || reply.title}
              variant="outline"
              className="h-auto p-3 text-right justify-start"
              onClick={() => onSelect(reply.content)}
            >
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{reply.title}</span>
                  {reply.usage_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {reply.usage_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {reply.content}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
