import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, Download } from 'lucide-react';
import { TRAVEL_TEMPLATE_LIBRARY, type LibraryTemplate } from '@/data/travelTemplateLibrary';
import { TEMPLATE_CATEGORIES, categoryMeta } from '@/data/travelTemplateCategories';
import { useWhatsAppTemplateCenter } from '@/hooks/useWhatsAppTemplateCenter';

export const TemplateLibraryDialog: React.FC = () => {
  const { importFromLibrary } = useWhatsAppTemplateCenter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [loc, setLoc] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return TRAVEL_TEMPLATE_LIBRARY.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (loc !== 'all' && t.locale !== loc) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          t.displayName.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.body.toLowerCase().includes(s) ||
          t.tags.some((tag) => tag.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [q, cat, loc]);

  const toggle = (key: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.key)));
  };

  const doImport = async (items: LibraryTemplate[]) => {
    if (!items.length) return;
    await importFromLibrary.mutateAsync(items);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <BookOpen className="w-4 h-4" />
          مكتبة القوالب ({TRAVEL_TEMPLATE_LIBRARY.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            مكتبة قوالب السفر
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث..." className="pr-8" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.labelAr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={loc} onValueChange={setLoc}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل اللغات</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {selected.size === filtered.length && filtered.length ? 'إلغاء الكل' : 'تحديد الكل'}
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3">
            {filtered.map((t) => {
              const meta = categoryMeta(t.category);
              const isSel = selected.has(t.key);
              return (
                <div
                  key={t.key}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${isSel ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => toggle(t.key)}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox checked={isSel} onCheckedChange={() => toggle(t.key)} onClick={(e) => e.stopPropagation()} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium truncate">{t.displayName}</h4>
                        <Badge variant="outline" className="text-[9px]">{t.locale.toUpperCase()}</Badge>
                      </div>
                      {meta && (
                        <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${meta.color} mb-1`}>
                          <meta.icon className="w-3 h-3" />
                          {meta.labelAr}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                      <p className="text-[11px] mt-1 line-clamp-2 whitespace-pre-wrap text-foreground/80">{t.body}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        doImport([t]);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                لا توجد نتائج
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="text-xs text-muted-foreground ml-auto">
            محدد: {selected.size} من {filtered.length}
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>إغلاق</Button>
          <Button
            onClick={() => doImport(filtered.filter((t) => selected.has(t.key)))}
            disabled={!selected.size || importFromLibrary.isPending}
          >
            <Download className="w-4 h-4 ml-1" />
            استيراد ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
