import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bell, Check, X, Clock, Plus, Send, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConversationFollowups } from '@/hooks/useConversationFollowups';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  conversationId: string;
}

const PRESETS = [
  { label: 'بعد 15 دقيقة', minutes: 15 },
  { label: 'بعد ساعة', minutes: 60 },
  { label: 'بعد 3 ساعات', minutes: 180 },
  { label: 'غداً', minutes: 60 * 24 },
];

export const FollowupsPanel: React.FC<Props> = ({ conversationId }) => {
  const { followups, isLoading, create, complete, cancel, snooze, isCreating } =
    useConversationFollowups(conversationId);
  const [note, setNote] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [mode, setMode] = useState<'reminder' | 'auto_send'>('reminder');
  const [templateId, setTemplateId] = useState<string>('');
  const { templates } = useWhatsAppTemplates() as { templates: any[] | undefined };
  const approvedTemplates = (templates || []).filter(
    (t) => (t.status || '').toLowerCase() === 'approved',
  );
  const autoSendReady = mode === 'reminder' || !!templateId;

  const submit = (remind_at: string) => {
    create({
      remind_at,
      note: note.trim() || undefined,
      mode,
      template_id: mode === 'auto_send' ? templateId : null,
    });
    setNote('');
  };

  const addQuick = (minutes: number) => {
    submit(new Date(Date.now() + minutes * 60_000).toISOString());
  };

  const addCustom = () => {
    if (!customTime) return;
    submit(new Date(customTime).toISOString());
    setCustomTime('');
  };

  const active = followups.filter((f) => f.status === 'pending');
  const past = followups.filter((f) => f.status !== 'pending');

  return (
    <div className="space-y-4">
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">متابعة جديدة</h4>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-muted/50">
          <Button
            type="button"
            size="sm"
            variant={mode === 'reminder' ? 'default' : 'ghost'}
            className="h-7 text-[11px]"
            onClick={() => setMode('reminder')}
          >
            <Bell className="w-3 h-3 me-1" />
            تذكير للموظف
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'auto_send' ? 'default' : 'ghost'}
            className="h-7 text-[11px]"
            onClick={() => setMode('auto_send')}
          >
            <Send className="w-3 h-3 me-1" />
            إرسال تلقائي
          </Button>
        </div>

        {mode === 'auto_send' && (
          <div className="space-y-1.5">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="اختر قالباً معتمداً للإرسال" />
              </SelectTrigger>
              <SelectContent>
                {approvedTemplates.length === 0 ? (
                  <div className="p-2 text-[11px] text-muted-foreground">لا توجد قوالب معتمدة</div>
                ) : (
                  approvedTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              يُرسل القالب تلقائياً في الموعد المحدد — القالب إلزامي لأن نافذة 24 ساعة قد تكون مغلقة.
            </p>
          </div>
        )}
        <Textarea
          placeholder="ملاحظة (اختياري): ماذا تريد أن تتابع؟"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.minutes}
              variant="outline"
              size="sm"
              disabled={isCreating || !autoSendReady}
              onClick={() => addQuick(p.minutes)}
              className="text-xs"
            >
              <Clock className="w-3 h-3 me-1" />
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="h-8 text-xs"
          />
          <Button size="sm" onClick={addCustom} disabled={!customTime || isCreating || !autoSendReady}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">التذكيرات النشطة</h4>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">جاري التحميل...</p>
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center border border-dashed rounded">
            لا توجد تذكيرات نشطة
          </p>
        ) : (
          active.map((f) => {
            const remindDate = new Date(f.remind_at);
            const isDue = remindDate <= new Date();
            return (
              <Card key={f.id} className={`p-2.5 ${isDue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Badge variant={isDue ? 'destructive' : 'secondary'} className="text-[10px]">
                    {isDue ? 'مستحق' : formatDistanceToNow(remindDate, { locale: ar, addSuffix: true })}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(remindDate, 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
                {f.mode === 'auto_send' && (
                  <Badge variant="outline" className="text-[9px] mb-1 gap-1">
                    <Send className="w-2.5 h-2.5" />
                    إرسال تلقائي
                  </Badge>
                )}
                {f.note && <p className="text-xs mb-2">{f.note}</p>}
                {f.last_error && (
                  <p className="text-[10px] text-destructive mb-2">{f.last_error}</p>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={() => complete(f.id)}>
                    <Check className="w-3 h-3 me-1" />
                    منجز
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => snooze({ id: f.id, minutes: 60 })}>
                    +1س
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => cancel(f.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">السجل</h4>
          {past.slice(0, 5).map((f) => (
            <div key={f.id} className="text-[11px] text-muted-foreground border-r-2 pr-2 py-1">
              <span>
                {f.status === 'done'
                  ? '✓ منجز'
                  : f.status === 'sent'
                    ? '✓ تم الإرسال'
                    : f.status === 'failed'
                      ? '⚠ فشل الإرسال'
                      : '✗ ملغى'}
              </span>
              {f.note && <span> — {f.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
