import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Search, Sparkles } from 'lucide-react';
import { useWhatsAppQuickReplies } from '@/hooks/useWhatsAppQuickReplies';
import { supabase } from '@/integrations/supabase/client';
import { interpolateVariables, VariableContext } from '@/lib/whatsappVariables';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  usage_count?: number | null;
}

interface Props {
  variables: VariableContext;
  onPick: (interpolatedText: string) => void;
}

export const QuickRepliesPicker: React.FC<Props> = ({ variables, onPick }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { quickReplies } = useWhatsAppQuickReplies() as { quickReplies: QuickReply[] | undefined };

  const categories = useMemo(() => {
    const set = new Set<string>();
    (quickReplies || []).forEach((q) => q.category && set.add(q.category));
    return ['all', ...Array.from(set)];
  }, [quickReplies]);

  const filtered = useMemo(() => {
    const list = quickReplies || [];
    const s = search.trim().toLowerCase();
    return list
      .filter((q) => activeCategory === 'all' || q.category === activeCategory)
      .filter((q) => !s || q.title.toLowerCase().includes(s) || q.content.toLowerCase().includes(s))
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
  }, [quickReplies, search, activeCategory]);

  const handlePick = async (reply: QuickReply) => {
    const text = interpolateVariables(reply.content, variables);
    onPick(text);
    setOpen(false);
    // Fire-and-forget usage counter
    try {
      await (supabase.from('quick_replies' as any).update({
        usage_count: (reply.usage_count || 0) + 1,
      }).eq('id', reply.id) as any);
    } catch (err) {
      console.warn('Failed to increment usage_count', err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title="الردود السريعة">
          <Zap className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" side="top">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">الردود السريعة</h4>
          </div>
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث..."
              className="h-8 pr-8 text-sm"
              autoFocus
            />
          </div>
          {categories.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] capitalize"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === 'all' ? 'الكل' : cat}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground p-6">
                لا توجد ردود سريعة
              </div>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handlePick(r)}
                  className="w-full text-right p-2 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{r.title}</span>
                    {r.usage_count ? (
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {r.usage_count}×
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                    {interpolateVariables(r.content, variables)}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
