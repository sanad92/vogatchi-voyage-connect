import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, FileText, MessageSquareText, Wand2, Loader2, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  conversationId: string;
  conversation: any;
  onInsertText?: (text: string) => void;
}

interface Suggestion { text: string; label?: string; }

export const AIAssistantPanel: React.FC<Props> = ({ conversationId, conversation, onInsertText }) => {
  const qc = useQueryClient();
  const [summary, setSummary] = useState<string>(conversation.ai_summary || '');
  const [summaryAt, setSummaryAt] = useState<string | null>(conversation.ai_summary_updated_at || null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const invokeFn = async (name: string, body: any) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'خطأ');
    return data;
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const d = await invokeFn('ai-summarize-conversation', { conversation_id: conversationId });
      setSummary(d.summary || '');
      setSummaryAt(new Date().toISOString());
      qc.invalidateQueries({ queryKey: ['whatsapp-conversation-detail', conversationId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const generateSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const d = await invokeFn('ai-smart-reply', { conversation_id: conversationId });
      setSuggestions(d.suggestions || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const extractInsights = async () => {
    setLoadingInsights(true);
    try {
      const d = await invokeFn('ai-extract-lead', { conversation_id: conversationId });
      setInsights(d.data || {});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleUseSuggestion = (text: string) => {
    if (onInsertText) {
      onInsertText(text);
      toast.success('تمت إضافة الرد للحقل');
    } else {
      navigator.clipboard.writeText(text);
      toast.success('تم النسخ');
    }
  };

  return (
    <div className="p-3 space-y-3">
      {/* Summary */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" /> ملخص المحادثة
            </div>
            <Button size="sm" variant="ghost" onClick={generateSummary} disabled={loadingSummary}>
              {loadingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {summary ? (
            <>
              <div className="text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 rounded p-2">{summary}</div>
              {summaryAt && (
                <div className="text-[10px] text-muted-foreground">
                  آخر تحديث: {formatDistanceToNow(new Date(summaryAt), { addSuffix: true, locale: ar })}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">اضغط زر التحديث لإنشاء ملخص AI للمحادثة</p>
          )}
        </CardContent>
      </Card>

      {/* Smart Reply */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Wand2 className="h-4 w-4 text-primary" /> اقتراحات الرد
            </div>
            <Button size="sm" variant="ghost" onClick={generateSuggestions} disabled={loadingSuggestions}>
              {loadingSuggestions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {suggestions.length === 0 && !loadingSuggestions && (
            <p className="text-xs text-muted-foreground">لا توجد اقتراحات بعد. اضغط للحصول على 3 ردود ذكية.</p>
          )}
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="border rounded-lg p-2 space-y-1 hover:border-primary/50 transition">
                {s.label && <Badge variant="outline" className="text-[10px]">{s.label}</Badge>}
                <div className="text-xs">{s.text}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                    onClick={() => handleUseSuggestion(s.text)}>
                    <Send className="h-3 w-3 me-1" /> استخدم
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { navigator.clipboard.writeText(s.text); toast.success('تم النسخ'); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-primary" /> استخراج الطلب
            </div>
            <Button size="sm" variant="ghost" onClick={extractInsights} disabled={loadingInsights}>
              {loadingInsights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {!insights && !loadingInsights && (
            <p className="text-xs text-muted-foreground">استخرج تلقائياً: الوجهة، التواريخ، عدد المسافرين، الميزانية.</p>
          )}
          {insights && (
            <div className="space-y-1 text-xs">
              {insights.summary && <div className="bg-muted/40 rounded p-2 italic">{insights.summary}</div>}
              <div className="grid grid-cols-2 gap-1.5">
                {insights.intent && <InsightRow label="نوع الطلب" value={insights.intent} />}
                {insights.destination_city && <InsightRow label="الوجهة" value={insights.destination_city} />}
                {insights.check_in_date && <InsightRow label="تاريخ الوصول" value={insights.check_in_date} />}
                {insights.nights && <InsightRow label="الليالي" value={String(insights.nights)} />}
                {insights.adults && <InsightRow label="بالغين" value={String(insights.adults)} />}
                {insights.children ? <InsightRow label="أطفال" value={String(insights.children)} /> : null}
                {insights.budget && <InsightRow label="الميزانية" value={insights.budget} />}
                {insights.urgency && <InsightRow label="الأولوية" value={insights.urgency} />}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const InsightRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-muted/40 rounded p-1.5">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="font-medium truncate">{value}</div>
  </div>
);

export default AIAssistantPanel;
