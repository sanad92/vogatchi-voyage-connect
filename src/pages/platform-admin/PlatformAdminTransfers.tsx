import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, Clock, Building2, CreditCard,
  Eye, Loader2, Search, BanknoteIcon
} from 'lucide-react';

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  approved: { label: 'تم القبول', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const PlatformAdminTransfers = () => {
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['bank-transfer-requests', filter],
    queryFn: async () => {
      let query = supabase
        .from('bank_transfer_requests')
        .select('*, organizations(name), subscription_plans(name, name_ar)')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const req = requests?.find(r => r.id === requestId);
      if (!req) throw new Error('الطلب غير موجود');

      // Update request status
      const { error: updateError } = await supabase
        .from('bank_transfer_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (updateError) throw updateError;

      // Activate subscription
      const durationDays = req.billing_cycle === 'yearly' ? 365 : 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          plan_id: req.plan_id,
          notes: `تم التفعيل عبر تحويل بنكي - مرجع: ${req.transfer_reference || 'غير محدد'}`,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', req.organization_id);
      if (subError) throw subError;

      // Record payment transaction
      await supabase.from('payment_transactions').insert({
        organization_id: req.organization_id,
        amount_cents: Math.round(req.amount * 100),
        currency: req.currency,
        status: 'completed',
        payment_method: 'bank_transfer',
      });
    },
    onSuccess: () => {
      toast.success('تم قبول الطلب وتفعيل الاشتراك');
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-requests'] });
      setSelectedRequest(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('bank_transfer_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم رفض الطلب');
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-requests'] });
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = requests?.filter(r =>
    !search || (r as any).organizations?.name?.toLowerCase().includes(search.toLowerCase())
      || r.transfer_reference?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BanknoteIcon className="h-6 w-6 text-primary" />
              طلبات التحويل البنكي
            </h1>
            <p className="text-muted-foreground text-sm mt-1">مراجعة وقبول طلبات الدفع بالتحويل البنكي</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {pendingCount} طلب في الانتظار
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالمؤسسة أو المرجع..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'الكل' : statusMap[f].label}
            </Button>
          ))}
        </div>

        {/* Requests Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !filtered?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد طلبات {filter !== 'all' ? statusMap[filter]?.label : ''}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const status = statusMap[req.status] || statusMap.pending;
              const StatusIcon = status.icon;
              return (
                <Card key={req.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {(req as any).organizations?.name || 'غير محدد'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            خطة {(req as any).subscription_plans?.name_ar} • {req.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="font-bold text-foreground">{req.amount?.toLocaleString('ar-EG')} ج.م</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at!).toLocaleDateString('ar-EG')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`${status.color} border`}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {status.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRequest(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setRejectionReason(''); }}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب التحويل</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">المؤسسة</p>
                    <p className="font-semibold">{(selectedRequest as any).organizations?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الخطة</p>
                    <p className="font-semibold">{(selectedRequest as any).subscription_plans?.name_ar}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المبلغ</p>
                    <p className="font-semibold">{selectedRequest.amount?.toLocaleString('ar-EG')} {selectedRequest.currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الدورة</p>
                    <p className="font-semibold">{selectedRequest.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">مرجع التحويل</p>
                    <p className="font-semibold">{selectedRequest.transfer_reference || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">التاريخ</p>
                    <p className="font-semibold">{new Date(selectedRequest.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">ملاحظات</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedRequest.notes}</p>
                  </div>
                )}

                {selectedRequest.receipt_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">إيصال التحويل</p>
                    <a
                      href={selectedRequest.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline text-sm"
                    >
                      عرض الإيصال
                    </a>
                  </div>
                )}

                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <div className="bg-destructive/10 p-3 rounded">
                    <p className="text-sm font-medium text-destructive">سبب الرفض:</p>
                    <p className="text-sm text-destructive">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {selectedRequest.status === 'pending' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="سبب الرفض (اختياري)"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            {selectedRequest?.status === 'pending' && (
              <DialogFooter className="gap-2">
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason })}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 ml-1" />}
                  رفض
                </Button>
                <Button
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 ml-1" />}
                  قبول وتفعيل الاشتراك
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default PlatformAdminTransfers;
