
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Zap } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface QuickRepliesPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export const QuickRepliesPanel: React.FC<QuickRepliesPanelProps> = ({ onSelect, onClose }) => {
  const { quickReplies, quickRepliesLoading } = useWhatsApp();

  return (
    <Card className="border-t border-l-0 border-r-0 border-b-0 rounded-none">
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
        {quickRepliesLoading ? (
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
            {quickReplies?.map((reply) => (
              <Button
                key={reply.id}
                variant="outline"
                size="sm"
                className="justify-start text-right p-2 h-auto"
                onClick={() => onSelect(reply.content)}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-medium text-xs">{reply.title}</span>
                    {reply.is_global && (
                      <Badge variant="secondary" className="text-xs">
                        عام
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 text-right line-clamp-2">
                    {reply.content}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
