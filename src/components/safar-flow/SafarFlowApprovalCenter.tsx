import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDecideApproval, useSopApprovals, useSopRealtime, type SopApproval } from '@/hooks/useSop';
import { APPROVAL_LABELS, labelViolation } from '@/lib/sop';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';

const formatDate = (v: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
};

function ApprovalItem({
  item, canManage, onDecide, deciding, chosen, setChosen, note, setNote,
}: {
  item: SopApproval;
  canManage: boolean;
  onDecide: (a: SopApproval, approve: boolean, note: string) => void;
  deciding: boolean;
  chosen: { id: string; approve: boolean } | null;
  setChosen: (next: { id: string; approve: boolean } | null) => void;
  note: string;
  setNote: (next: string) => void;
}) {
  const isPending = item.status === 'pending';
  const confirming = chosen?.id === item.id;
  const rejectMissingReason = confirming && !chosen.approve && note.trim().length < 3;
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm">{APPROVAL_LABELS[item.approval_type] || item.approval_type}</p>
            <Badge variant={item.status === 'approved' ? 'secondary' : item.status === 'rejected' ? 'destructive' : 'outline'}>
              {item.status === 'pending' ? 'بانتظار قرار' : item.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{item.reason || 'لم يُكتب سبب للطلب'}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(item.created_at)}
            {item.amount != null ? ` · القيمة المرجعية: ${Number(item.amount).toLocaleString('ar-EG')} (العملة غير محددة هنا)` : ''}
          </p>
          {item.status !== 'pending' && item.decision_note && (
            <p className="text-xs text-muted-foreground">ملاحظة القرار: {item.decision_note}</p>
          )}
          {item.status !== 'pending' && item.decided_at && (
            <p className="text-xs text-muted-foreground">تاريخ القرار: {formatDate(item.decided_at)}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {item.booking_id && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/bookings/${item.booking_id}/workspace`}>
                <ExternalLink className="h-3.5 w-3.5 ml-1" /> الحجز
              </Link>
            </Button>
          )}
          {item.lead_id && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/sop/pipeline"><ExternalLink className="h-3.5 w-3.5 ml-1" /> مسار المبيعات</Link>
            </Button>
          )}
          {isPending && canManage && !confirming && (
            <>
              <Button size="sm" variant="outline" disabled={deciding} onClick={() => { setChosen({ id: item.id, approve: true }); setNote(''); }}>
                <CheckCircle2 className="h-4 w-4 ml-1" /> مراجعة الموافقة
              </Button>
              <Button size="sm" variant="outline" disabled={deciding} onClick={() => { setChosen({ id: item.id, approve: false }); setNote(''); }}>
                <XCircle className="h-4 w-4 ml-1" /> مراجعة الرفض
              </Button>
            </>
          )}
        </div>
      </div>
      {confirming && (
        <div className="bg-muted/50 border rounded-md p-3 space-y-3">
          <p className="text-sm font-medium">
            {chosen.approve ? 'تأكيد اعتماد طلب الإدارة' : 'تأكيد رفض الطلب'}
          </p>
          <p className="text-xs text-muted-foreground">
            تسجيل القرار لا ينفذ حجزًا أو دفعًا أو استردادًا. الإجراء التشغيلي يتم من وحدته الأصلية وبصلاحياته.
          </p>
          <Textarea
            value={note}
            maxLength={1000}
            placeholder={chosen.approve ? 'ملاحظة اختيارية للقرار' : 'سبب الرفض — مطلوب (3 أحرف على الأقل)'}
            onChange={(e) => setNote(e.target.value)}
            aria-label="ملاحظة قرار الموافقة"
          />
          {rejectMissingReason && <p className="text-xs text-destructive">اكتب سبب الرفض قبل تسجيل القرار.</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={deciding || !!rejectMissingReason || note.length > 1000}
              onClick={() => onDecide(item, chosen.approve, note)}
            >
              {deciding ? 'جاري الحفظ…' : 'تسجيل القرار'}
            </Button>
            <Button size="sm" variant="outline" disabled={deciding} onClick={() => setChosen(null)}>إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reuses the existing SOP approval table and RPCs.
 * Never creates a parallel approval ledger or executes financial actions.
 */
export function SafarFlowApprovalCenter() {
  useSopRealtime();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const pending = useSopApprovals({ status: 'pending' });
  const history = useSopApprovals();
  const decide = useDecideApproval();
  const [chosen, setChosen] = useState<{ id: string; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const { data: canManage = false } = useQuery({
    queryKey: ['safar-flow-approval-manager', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      if (!orgId || !user?.id) return false;
      const { data, error } = await supabase.from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return ['owner','admin','manager'].includes(data?.role || '');
    },
  });

  const onDecide = (item: SopApproval, approve: boolean, decisionNote: string) => {
    decide.mutate({ approvalId: item.id, approve, note: decisionNote }, {
      onSuccess: result => {
        if (result?.allowed) {
          setChosen(null);
          setNote('');
        }
      },
    });
  };
  const pendingList = pending.data || [];
  const recentDecisions = (history.data || []).filter(a => a.status !== 'pending').slice(0, 40);
  const failed = pending.isError || history.isError;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Safar Flow Approval Center
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            نفس موافقات SOP الموجودة في Safar ERP، من غير إنشاء نظام جديد أو تجاوز الصلاحيات المالية.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { pending.refetch(); history.refetch(); }} disabled={pending.isFetching || history.isFetching}>
          <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.isLoading || history.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل الموافقات…</p>
        ) : failed ? (
          <div role="alert" className="rounded-lg border border-destructive/30 p-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> تعذر تحميل الموافقات: {(pending.error as Error)?.message || (history.error as Error)?.message || 'الخدمة غير متاحة'}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline">{pendingList.length} طلب معلق ضمن أحدث 300</Badge>
              <Badge variant="secondary">{recentDecisions.length} قرار حديث معروض</Badge>
              {canManage
                ? <Badge variant="outline"><ShieldCheck className="h-3 w-3 ml-1" /> صلاحية مراجعة إدارية</Badge>
                : <Badge variant="outline">عرض فقط — قرار الإدارة من صلاحيات المدير</Badge>}
            </div>
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">بانتظار قرار</TabsTrigger>
                <TabsTrigger value="history">سجل القرارات</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="space-y-2 mt-3">
                {!pendingList.length ? <p className="text-sm text-muted-foreground">لا توجد موافقات معلقة في القائمة.</p>
                  : pendingList.map(item => (
                    <ApprovalItem
                      key={item.id} item={item} canManage={canManage}
                      deciding={decide.isPending}
                      chosen={chosen} setChosen={setChosen} note={note} setNote={setNote}
                      onDecide={onDecide}
                    />
                  ))}
              </TabsContent>
              <TabsContent value="history" className="space-y-2 mt-3">
                {!recentDecisions.length ? <p className="text-sm text-muted-foreground">لا توجد قرارات حديثة في القائمة.</p>
                  : recentDecisions.map(item => (
                    <ApprovalItem
                      key={item.id} item={item} canManage={false}
                      deciding={false}
                      chosen={null} setChosen={() => {}} note="" setNote={() => {}}
                      onDecide={() => {}}
                    />
                  ))}
              </TabsContent>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              القرارات بتتسجل في نظام SOP الأصلي. الموافقة الإدارية لا تعني تنفيذ العملية نفسها؛
              يجب استكمال شروط الحجز والتحصيل والموردين من شاشاتهم المختصة.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
