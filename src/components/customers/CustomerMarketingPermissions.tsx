import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrgId } from '@/hooks/useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type Channel = 'email' | 'whatsapp';
type PermissionState = 'unavailable' | 'blocked_preference' | 'no_contact' | 'contact_changed' | 'withdrawn' | 'recorded' | 'not_recorded';
type PermissionRow = { channel: Channel; state: PermissionState; evidence_at: string | null; recorded_at: string | null };

const channelLabels: Record<Channel, string> = { email: 'البريد الإلكتروني', whatsapp: 'واتساب' };
const stateLabels: Record<PermissionState, string> = {
  unavailable: 'العميل مؤرشف',
  blocked_preference: 'التواصل موقوف في تفضيلات العميل',
  no_contact: 'بيانات التواصل غير متاحة',
  contact_changed: 'القناة تحتاج موافقة جديدة',
  withdrawn: 'تم سحب الموافقة',
  recorded: 'الموافقة موثّقة',
  not_recorded: 'لا توجد موافقة مسجّلة',
};

export function CustomerMarketingPermissions({
  customerId, organizationId, canEdit,
}: {
  customerId: string;
  organizationId: string | null;
  canEdit: boolean;
}) {
  const activeOrg = useOrgId();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [evidenceTime, setEvidenceTime] = useState('');
  const [reference, setReference] = useState('');
  const currentOrganization = Boolean(organizationId && activeOrg === organizationId);
  const queryKey = ['customer-marketing-permissions', organizationId, customerId];

  const permissions = useQuery({
    queryKey,
    enabled: currentOrganization,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<PermissionRow[]>('get_customer_marketing_permissions', {
        _organization: organizationId, _customer: customerId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (input: { channel: Channel; allowed: boolean; evidenceAt?: string; reference?: string }) => {
      if (!currentOrganization) throw new Error('تعذّر تحديد الشركة');
      const { error } = await callUntypedRpc('set_customer_marketing_permission', {
        _organization: organizationId, _customer: customerId, _channel: input.channel,
        _allowed: input.allowed, _evidence_at: input.evidenceAt ?? null, _evidence_reference: input.reference ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey });
      setChannel(null);
      toast.success(input.allowed ? 'تم توثيق الموافقة' : 'تم تسجيل سحب الموافقة');
    },
    onError: (error: { message: string }) => toast.error(
      error.message === 'marketing_consent_evidence_predates_withdrawal'
        ? 'سجّل موافقة جديدة صدرت بعد سحب الموافقة السابقة.'
        : error.message === 'marketing_consent_evidence_invalid'
          ? 'راجع تاريخ الموافقة ومرجع الإثبات.'
          : 'تعذّر تحديث موافقة التواصل التسويقي',
    ),
  });

  const openEvidence = (kind: Channel) => {
    setChannel(kind);
    setEvidenceTime('');
    setReference('');
  };

  const recordConsent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channel || !reference.trim() || !evidenceTime) return;
    const date = new Date(evidenceTime);
    if (!Number.isFinite(date.getTime())) return;
    save.mutate({ channel, allowed: true, evidenceAt: date.toISOString(), reference: reference.trim() });
  };

  if (!currentOrganization) return null;

  return (
    <Card>
      <CardHeader><CardTitle>موافقات التواصل التسويقي</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">وثّق موافقة العميل لكل قناة. التسجيل لا يرسل رسالة.</p>
        {permissions.isPending ? <p role="status">جارٍ تحميل الموافقات…</p>
          : permissions.isError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p role="alert">تعذّر تحميل الموافقات.</p>
              <Button variant="outline" size="sm" onClick={() => void permissions.refetch()}>إعادة المحاولة</Button>
            </div>
          ) : (
            <ul className="divide-y">
              {permissions.data.map(({ channel: kind, state, evidence_at }) => (
                <li key={kind} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-1">
                    <span className="me-2 font-medium">{channelLabels[kind]}</span>
                    <Badge variant={state === 'recorded' ? 'secondary' : 'outline'}>{stateLabels[state]}</Badge>
                    {evidence_at && <p className="text-xs text-muted-foreground" data-no-translate>{new Date(evidence_at).toLocaleString('ar-EG')}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      {['not_recorded', 'withdrawn', 'contact_changed'].includes(state) && (
                        <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => openEvidence(kind)}>
                          توثيق موافقة
                        </Button>
                      )}
                      {state !== 'withdrawn' && (
                        <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => save.mutate({ channel: kind, allowed: false })}>
                          تسجيل الرفض أو السحب
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </CardContent>
      <Dialog open={Boolean(channel)} onOpenChange={open => { if (!open && !save.isPending) setChannel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>توثيق موافقة التواصل التسويقي</DialogTitle>
            <DialogDescription>
              سجّل تاريخ موافقة العميل الصريحة على {channel ? channelLabels[channel] : 'هذه القناة'} ومرجعًا يمكن الرجوع إليه.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={recordConsent}>
            <div className="space-y-2">
              <Label htmlFor="marketing-evidence-date">وقت موافقة العميل</Label>
              <Input id="marketing-evidence-date" type="datetime-local" step={1} value={evidenceTime}
                onChange={event => setEvidenceTime(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-evidence-reference">مرجع الإثبات</Label>
              <Input id="marketing-evidence-reference" value={reference} maxLength={200}
                onChange={event => setReference(event.target.value)} required />
            </div>
            <DialogFooter><Button type="submit" disabled={save.isPending || !evidenceTime || !reference.trim()}>حفظ الموافقة</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
