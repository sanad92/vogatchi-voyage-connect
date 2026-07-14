import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Search, Send } from 'lucide-react';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { interpolateVariables, VariableContext } from '@/lib/whatsappVariables';

interface Props {
  variables: VariableContext;
  onPick: (interpolatedText: string) => void;
  /** When set: clicking a template sends it directly via this callback instead of just prefilling. */
  onSendDirect?: (payload: {
    templateName: string;
    templateLanguage: string;
    templateParameters: string[];
    previewText: string;
  }) => Promise<void> | void;
  /** Controlled open state (parent forces the picker open, e.g. when 24h window is closed). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Only show approved templates (used in closed-window / direct-send mode). */
  approvedOnly?: boolean;
  /** Optional custom trigger node; falls back to a small icon button. Ignored when hideTrigger=true. */
  triggerNode?: React.ReactNode;
  hideTrigger?: boolean;

// Maps a template category / name to a human-facing bucket
const CATEGORY_BUCKETS: Array<{ key: string; label: string; match: (t: any) => boolean }> = [
  { key: 'booking', label: 'الحجوزات', match: (t) => /book|حجز/i.test(`${t.category} ${t.name}`) },
  { key: 'payments', label: 'المدفوعات والفواتير', match: (t) => /pay|invoice|فاتور|دفع/i.test(`${t.category} ${t.name}`) },
  { key: 'hotels', label: 'الفنادق', match: (t) => /hotel|فندق/i.test(`${t.category} ${t.name}`) },
  { key: 'flights', label: 'الطيران', match: (t) => /flight|طيران|رحل/i.test(`${t.category} ${t.name}`) },
  { key: 'crm', label: 'متابعة العملاء', match: (t) => /follow|crm|متابع/i.test(`${t.category} ${t.name}`) },
  { key: 'marketing', label: 'التسويق', match: (t) => /market|promo|عرض|تسويق/i.test(`${t.category} ${t.name}`) },
];

const bucketFor = (t: any) => CATEGORY_BUCKETS.find((b) => b.match(t))?.key || 'other';
const bucketLabel = (key: string) =>
  CATEGORY_BUCKETS.find((b) => b.key === key)?.label || 'أخرى';

// Extract ordered {{1}} {{2}} … or {{var_name}} placeholders and resolve values from context.
const extractParameters = (body: string, interpolated: string, ctx: VariableContext): string[] => {
  const matches = Array.from(body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi));
  return matches.map((m) => {
    const key = m[1].toLowerCase();
    // numeric placeholder → try same-index positional variable, else leave placeholder text
    const val = (ctx as any)[key];
    if (val != null && val !== '') return String(val);
    // Fallback: use interpolated text token if identical, else empty string
    return '';
  });
};

export const TemplatesPicker: React.FC<Props> = ({
  variables,
  onPick,
  onSendDirect,
  open: controlledOpen,
  onOpenChange,
  approvedOnly,
  hideTrigger,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : uncontrolledOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };

  const [search, setSearch] = useState('');
  const { templates } = useWhatsAppTemplates() as { templates: any[] | undefined };

  const grouped = useMemo(() => {
    const list = templates || [];
    const s = search.trim().toLowerCase();
    const filtered = list
      .filter((t) => {
        const status = (t.status || '').toLowerCase();
        if (approvedOnly || onSendDirect) return status === 'approved';
        return status !== 'rejected';
      })
      .filter(
        (t) =>
          !s ||
          (t.name || '').toLowerCase().includes(s) ||
          (t.body_text || '').toLowerCase().includes(s),
      );

    const groups: Record<string, any[]> = {};
    for (const t of filtered) {
      const key = bucketFor(t);
      (groups[key] ||= []).push(t);
    }
    // Order: known buckets first, then Other
    const order = [...CATEGORY_BUCKETS.map((b) => b.key), 'other'];
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({ key: k, label: bucketLabel(k), items: groups[k] }));
  }, [templates, search, approvedOnly, onSendDirect]);

  const handlePick = async (t: any) => {
    const body = t.body_text || t.content || '';
    const preview = interpolateVariables(body, variables);
    if (onSendDirect) {
      const params = extractParameters(body, preview, variables);
      await onSendDirect({
        templateName: t.name,
        templateLanguage: t.language || 'ar',
        templateParameters: params,
        previewText: preview,
      });
      setOpen(false);
      return;
    }
    onPick(preview);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" title="القوالب المعتمدة">
            <FileText className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-[420px] p-0" side="top">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">
              {onSendDirect ? 'اختر قالباً للإرسال' : 'قوالب واتساب'}
            </h4>
          </div>
          {onSendDirect && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              نافذة 24 ساعة مغلقة — إرسال القالب مباشرة إلى العميل بعد الاختيار.
            </p>
          )}
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
        <ScrollArea className="h-[360px]">
          <div className="p-2 space-y-3">
            {grouped.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground p-6">
                {onSendDirect ? 'لا توجد قوالب معتمدة متاحة' : 'لا توجد قوالب متاحة'}
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.key} className="space-y-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handlePick(t)}
                      className="w-full text-right p-2 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{t.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.status && (
                            <Badge
                              variant={t.status === 'approved' ? 'default' : 'secondary'}
                              className="text-[9px] capitalize"
                            >
                              {t.status}
                            </Badge>
                          )}
                          {onSendDirect && (
                            <Send className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {interpolateVariables(t.body_text || '', variables)}
                      </p>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
