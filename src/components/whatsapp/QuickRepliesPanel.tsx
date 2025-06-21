
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';

interface QuickReplysPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

// ردود سريعة مؤقتة حتى يتم إنشاء الجدول
const TEMP_QUICK_REPLIES = [
  {
    id: '1',
    title: 'ترحيب',
    content: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟'
  },
  {
    id: '2', 
    title: 'معلومات الحجز',
    content: 'يرجى تزويدي بتفاصيل الحجز الذي تريد الاستفسار عنه'
  },
  {
    id: '3',
    title: 'شكر',
    content: 'شكراً لك على تواصلك معنا. نتطلع لخدمتك مرة أخرى'
  },
  {
    id: '4',
    title: 'انتظار',
    content: 'سأقوم بمراجعة طلبك وسأعود إليك قريباً'
  }
];

export const QuickRepliesPanel: React.FC<QuickReplysPanelProps> = ({ onSelect, onClose }) => {
  return (
    <Card className="m-4 border-blue-200 bg-blue-50">
      <CardHeader className="py-2">
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
        <div className="grid grid-cols-2 gap-2">
          {TEMP_QUICK_REPLIES.map((reply) => (
            <Button
              key={reply.id}
              variant="outline"
              size="sm"
              className="text-xs justify-start"
              onClick={() => onSelect(reply.content)}
            >
              {reply.title}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
