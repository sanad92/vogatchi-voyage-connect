import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Search } from 'lucide-react';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { interpolateVariables, VariableContext } from '@/lib/whatsappVariables';

interface Props {
  variables: VariableContext;
  onPick: (interpolatedText: string) => void;
}

export const TemplatesPicker: React.FC<Props> = ({ variables, onPick }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { templates } = useWhatsAppTemplates() as { templates: any[] | undefined };

  const filtered = useMemo(() => {
    const list = templates || [];
    const s = search.trim().toLowerCase();
    return list
      .filter((t) => (t.status || '').toLowerCase() !== 'rejected')
      .filter((t) =>
        !s ||
        (t.name || '').toLowerCase().includes(s) ||
        (t.body_text || '').toLowerCase().includes(s),
      );
  }, [templates, search]);

  const handlePick = (t: any) => {
    const body = t.body_text || t.content || '';
    onPick(interpolateVariables(body, variables));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title="القوالب المعتمدة">
          <FileText className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" side="top">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">قوالب واتساب</h4>
          </div>
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في القوالب..."
              className="h-8 pr-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground p-6">
                لا توجد قوالب متاحة
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handlePick(t)}
                  className="w-full text-right p-2 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.category && (
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {t.category}
                        </Badge>
                      )}
                      {t.status && (
                        <Badge
                          variant={t.status === 'approved' ? 'default' : 'secondary'}
                          className="text-[9px] capitalize"
                        >
                          {t.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                    {interpolateVariables(t.body_text || '', variables)}
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
