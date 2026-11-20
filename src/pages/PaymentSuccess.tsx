import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const checkoutMessages: Record<string, { title: string; description: string }> = {
  confirmed: {
    title: 'تم تأكيد الدفع وتفعيل الاشتراك',
    description: 'سُجّلت عملية الدفع في سجل المدفوعات.',
  },
  activating: {
    title: 'تم تأكيد الدفع وجارٍ تفعيل الاشتراك',
    description: 'تحقّق مرة أخرى قبل إجراء دفعة جديدة. إذا تأخر التفعيل، تواصل مع الدعم.',
  },
  pending: {
    title: 'في انتظار تأكيد الدفع',
    description: 'ما زلنا ننتظر تأكيد عملية الدفع. يمكنك التحقق من الحالة مرة أخرى.',
  },
  failed: {
    title: 'لم تكتمل عملية الدفع',
    description: 'أبلغت بوابة الدفع عن محاولة غير ناجحة. تحقّق من الحالة إذا أعدت المحاولة.',
  },
  expired: {
    title: 'انتهت صلاحية جلسة الدفع',
    description: 'لم يُسجَّل دفع مؤكّد لهذه الجلسة. إذا خُصم المبلغ، راجع سجل المدفوعات أو تواصل مع الدعم.',
  },
  voided: {
    title: 'أُلغيت عملية الدفع',
    description: 'أكّدت بوابة الدفع إلغاء العملية.',
  },
  refunded: {
    title: 'تم رد الدفعة',
    description: 'أكّدت بوابة الدفع رد الدفعة.',
  },
  unavailable: {
    title: 'تعذّر عرض حالة الدفع',
    description: 'يمكنك مراجعة سجل المدفوعات في صفحة الاشتراك.',
  },
};

const PaymentSuccess = () => {
  const { checkoutId } = useParams();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user && checkoutId && UUID_PATTERN.test(checkoutId));
  const checkout = useQuery({
    queryKey: ['subscription-checkout-status', user?.id, checkoutId],
    enabled,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_checkout_status', {
        p_checkout_id: checkoutId!,
      }).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: ({ state }) => {
      const status = state.data?.status;
      return state.dataUpdateCount + state.errorUpdateCount < 20 && (status === 'pending' || status === 'activating') ? 3000 : false;
    },
  });

  const receipt = checkout.data;
  const status = !checkout.isError && receipt?.status ? receipt.status : 'unavailable';
  const confirmed = status === 'confirmed';
  const waiting = status === 'pending' || status === 'activating';
  const message = checkoutMessages[status] ?? checkoutMessages.unavailable;
  const checking = enabled && checkout.isLoading;

  useEffect(() => {
    if (!confirmed) return;
    queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    queryClient.invalidateQueries({ queryKey: ['my-subscription-full'] });
    queryClient.invalidateQueries({ queryKey: ['my-payment-transactions'] });
  }, [confirmed, queryClient]);

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8" dir="rtl">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center" aria-hidden="true">
            {checking ? <Loader2 className="h-16 w-16 animate-spin text-primary" />
              : confirmed ? <CheckCircle2 className="h-16 w-16 text-green-600" />
              : waiting ? <Clock className="h-16 w-16 text-primary" />
              : <XCircle className="h-16 w-16 text-muted-foreground" />}
          </div>
          <CardTitle className="text-2xl" aria-live="polite">
            {checking ? 'جارٍ التحقق من حالة الدفع' : message.title}
          </CardTitle>
        </CardHeader>
        {!checking && (
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{message.description}</p>
            {(confirmed || status === 'activating') && receipt && (
              <dl className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <dt>المبلغ</dt>
                  <dd className="font-semibold">
                    {(receipt.amount_cents / 100).toLocaleString('ar-EG', {
                      style: 'currency', currency: receipt.currency,
                    })}
                  </dd>
                </div>
                {receipt.transaction_id && (
                  <div className="flex justify-between gap-2">
                    <dt>رقم المعاملة</dt>
                    <dd className="font-mono" dir="ltr">{receipt.transaction_id}</dd>
                  </div>
                )}
                {confirmed && receipt.activated_at && (
                  <div className="flex justify-between gap-2">
                    <dt>تاريخ التفعيل</dt>
                    <dd>{new Date(receipt.activated_at).toLocaleString('ar-EG')}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild><Link to="/subscription">إدارة الاشتراك</Link></Button>
              {enabled && !confirmed && (
                <Button variant="outline" disabled={checkout.isFetching} onClick={() => checkout.refetch()}>
                  التحقق مرة أخرى
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
