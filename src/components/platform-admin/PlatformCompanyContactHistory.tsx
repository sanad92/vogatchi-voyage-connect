import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PAGE_SIZE, TablePager } from '@/components/platform-admin/TablePager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { contactChannels, contactOutcomes } from '@/lib/platformCompanyFollowup';

export function PlatformCompanyContactHistory({ organizationId }: { organizationId: string }) {
  const { user } = useOptimizedAuth();
  const { dir, language } = useLanguage();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [entryId, setEntryId] = useState<string>();
  const [channel, setChannel] = useState('call');
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const key = ['platform-company-contact-history', user?.id, organizationId];
  const date = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
  });

  const history = useQuery({
    queryKey: [...key, page],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      const { data, count, error } = await supabase.from('platform_company_contact_history')
        .select('id, channel, outcome, note, recorded_by, recorded_at', { count: 'exact' })
        .eq('organization_id', organizationId).order('recorded_at', { ascending: false }).order('id', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1).abortSignal(signal);
      if (error) throw error;
      const authors = [...new Set(data.flatMap((row) => row.recorded_by ? [row.recorded_by] : []))];
      const names = new Map<string, string>();
      if (authors.length) {
        const profiles = await supabase.from('profiles').select('id,full_name,email').in('id', authors).abortSignal(signal);
        if (profiles.error) throw profiles.error;
        for (const p of profiles.data) names.set(p.id, p.full_name?.trim() || p.email || '');
      }
      return { rows: data, total: count ?? 0, names };
    },
  });

  const save = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_company_contact_history').upsert({
        id, organization_id: organizationId, channel, outcome, note: note.trim(),
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      setEntryId(undefined);
      setOutcome('');
      setNote('');
      setPage(1);
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ['platform-company-due'] });
      toast.success('تم تسجيل التواصل');
    },
    onError: () => toast.error('تعذّر تسجيل التواصل. حاول مرة أخرى.'),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!outcome || (outcome === 'other' && !note.trim()) || save.isPending) return;
    const id = entryId ?? crypto.randomUUID();
    setEntryId(id);
    save.mutate(id);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">سجل التواصل</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-channel">طريقة التواصل</Label>
              <Select dir={dir} value={channel} onValueChange={setChannel} disabled={save.isPending || !!entryId}>
                <SelectTrigger id="contact-channel"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(contactChannels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-outcome">نتيجة التواصل</Label>
              <Select dir={dir} value={outcome} onValueChange={setOutcome} disabled={save.isPending || !!entryId}>
                <SelectTrigger id="contact-outcome"><SelectValue placeholder="اختَر النتيجة" /></SelectTrigger>
                <SelectContent>{Object.entries(contactOutcomes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-note">ملخص التواصل</Label>
            <Textarea id="contact-note" value={note} onChange={(event) => setNote(event.target.value)}
              required={outcome === 'other'} maxLength={1000} disabled={save.isPending || !!entryId} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!outcome || (outcome === 'other' && !note.trim()) || save.isPending}>تسجيل التواصل</Button>
            {save.isError && <Button type="button" variant="outline" onClick={() => { setEntryId(undefined); save.reset(); }}>تعديل المسودة</Button>}
          </div>
        </form>
        {history.isPending ? <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل البيانات</p> : history.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            <span>تعذّر تحميل سجل التواصل</span><Button size="sm" variant="outline" onClick={() => history.refetch()}>إعادة المحاولة</Button>
          </div>
        ) : history.data.rows.length ? (
          <ul className="divide-y divide-border border-t">
            {history.data.rows.map((row) => (
              <li key={row.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{contactChannels[row.channel as keyof typeof contactChannels]}</Badge>
                  <span className="font-medium">{contactOutcomes[row.outcome as keyof typeof contactOutcomes]}</span>
                  <time className="text-xs text-muted-foreground" dateTime={row.recorded_at}>{date.format(new Date(row.recorded_at))}</time>
                  {row.recorded_by && <bdi className="break-all text-xs text-muted-foreground" data-no-translate>{history.data.names.get(row.recorded_by)}</bdi>}
                </div>
                {row.note && <p className="whitespace-pre-wrap break-words text-sm" data-no-translate>{row.note}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">لسه مفيش تواصل مسجّل مع الشركة.</p>}
        {history.data && <TablePager page={page} pageCount={Math.ceil(history.data.total / PAGE_SIZE)} total={history.data.total} onChange={setPage} />}
      </CardContent>
    </Card>
  );
}
