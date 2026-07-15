import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Variable, Search } from 'lucide-react';
import { VARIABLE_GROUPS } from '@/lib/whatsappVariables';

interface Props {
  onInsert: (token: string) => void;
}

export const VariableInserter: React.FC<Props> = ({ onInsert }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = VARIABLE_GROUPS.map((g) => ({
    ...g,
    variables: g.variables.filter(
      (v) =>
        !q ||
        v.key.toString().includes(q.toLowerCase()) ||
        v.label.includes(q),
    ),
  })).filter((g) => g.variables.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Variable className="w-4 h-4" />
          إدراج متغير
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن متغير..."
              className="h-8 pr-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[340px]">
          <div className="p-2 space-y-3">
            {filtered.map((g) => (
              <div key={g.key} className="space-y-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.variables.map((v) => (
                    <button
                      key={v.key.toString()}
                      onClick={() => {
                        onInsert(`{{${v.key}}}`);
                        setOpen(false);
                      }}
                      className="text-right p-2 text-xs rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border"
                    >
                      <div className="font-medium truncate">{v.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {`{{${v.key}}}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
