import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { BellRing, CheckCircle2, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useOrgId } from '@/hooks/useOrgId';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Followup {
  id: string; step: number; due_at: string; status: string; notified_at: string | null;
  responded_at: string | null; response_source: string | null; response_note: string | null;
}

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'مجدول', variant: 'outline' },
  notified: { label: 'مستحق الآن', variant: 'destructive' },
  done: { label: 'تمت المتابعة', variant: 'secondary' },
  responded: { label: 'العميل رد', variant: 'default' },
  cancelled: { label: 'متوقف', variant: 'secondary' },
};

export default function QuoteFollowupsPanel({ quoteId, canEdit }: { quoteId: string; canEdit: boolean }) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ['quote-followups', orgId, quoteId],
    queryFn: async (): Promise<Followup[]> => {
      const { data, error } = await (supabase as any).from('quote_followups').select('*')
        .eq('organization_id', orgId).eq('quote_id', quoteId).order('step');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    refetchOnWindowFocus: true,
  });

  if (!data.length) return null;
  const open = data.filter((f) => f.status === 'pending' || f.status === 'notified');
  const response = data.find((f) => f.status === 'responded' && f.responded_at);

  const act = async (id: string, action: 'responded' | 'done') => {
    setBusy(id + action);
    try {
      const { error } = await callUntypedRpc('record_quote_followup', { _followup: id, _action: action, _note: note || null });
      if (error) throw new Error(error.message);
      setNote('');
      qc.invalidateQueries({ queryKey: ['quote-followups', orgId, quoteId] });
      toast.success(action === 'responded' ? 'تم تسجيل رد العميل وإيقاف التذكيرات' : 'تم تسجيل المتابعة');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><BellRing className="h-4 w-4" /> متابعة العميل بعد الإرسال</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {response && (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex items-center gap-1 font-medium">
              <MessageCircle className="h-4 w-4" /> رد العميل {response.response_source === 'whatsapp' ? 'عبر واتساب' : '(مسجل يدويًا)'}
              <span className="text-xs text-muted-foreground ms-auto">{format(new Date(response.responded_at!), 'd MMM، HH:mm', { locale: ar })}</span>
            </div>
            {response.response_note && <p className="whitespace-pre-wrap">{response.response_note}</p>}
          </div>
        )}

        <div className="space-y-2">
          {data.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-sm border-b last:border-0 pb-2">
              <span className="font-medium">تذكير {f.step}</span>
              <span className="text-muted-foreground">{format(new Date(f.due_at), 'EEEE d MMM', { locale: ar })}</span>
              <Badge variant={STATUS[f.status]?.variant} className="ms-auto">{STATUS[f.status]?.label}</Badge>
              {canEdit && (f.status === 'pending' || f.status === 'notified') && (
                <Button size="sm" variant="ghost" className="h-7" disabled={!!busy} onClick={() => act(f.id, 'done')}>
                  {busy === f.id + 'done' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span className="ms-1">تابعت</span>
                </Button>
              )}
            </div>
          ))}
        </div>

        {canEdit && open.length > 0 && (
          <div className="space-y-2">
            <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة المتابعة أو رد العميل (مثلاً: رد بالتليفون وطلب تعديل التواريخ)" />
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(open[0].id, 'responded')}>
              {busy === open[0].id + 'responded' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'العميل رد — أوقف التذكيرات'}
            </Button>
            <p className="text-xs text-muted-foreground">لو العميل رد على واتساب، الرد يتسجل هنا تلقائيًا والتذكيرات تقف.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
