import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionCheckoutReferences } from '@/lib/subscriptionCheckoutReturn';

const maxChecks = 8;
const checkInterval = 2500;
const requestTimeout = 6000;

type CheckoutResult =
  | { state: 'pending' | 'failed' | 'expired' | 'voided' | 'refunded' }
  | { state: 'activated' | 'paid'; amount_cents: number; transaction_id: string; is_test: boolean | null };

function readCheckoutResult(data: unknown): CheckoutResult | null {
  if (data === null) return null;
  if (!data || typeof data !== 'object' || !('state' in data)) throw new Error('Invalid checkout result');
  const { state } = data;
  if (state === 'activated' || state === 'paid') {
    if (!('amount_cents' in data) || typeof data.amount_cents !== 'number' ||
      !Number.isSafeInteger(data.amount_cents) || data.amount_cents <= 0 ||
      !('transaction_id' in data) || typeof data.transaction_id !== 'string' ||
      !('is_test' in data) || (data.is_test !== null && typeof data.is_test !== 'boolean')) {
      throw new Error('Invalid confirmed payment');
    }
    const isTest = typeof data.is_test === 'boolean' ? data.is_test : null;
    return { state, amount_cents: data.amount_cents, transaction_id: data.transaction_id, is_test: isTest };
  }
  if (state === 'pending' || state === 'failed' || state === 'expired' || state === 'voided' || state === 'refunded') {
    return { state };
  }
  throw new Error('Unknown checkout state');
}

const descriptions = {
  pending: 'حالة الدفع لسه تحت التحقق. تقدر تراجع الاشتراك أو تتحقق مرة أخرى.',
  failed: 'مزود الدفع أبلغ بفشل هذه العملية.',
  expired: 'انتهت صلاحية جلسة الدفع ولم يتأكد الدفع.',
  voided: 'مزود الدفع ألغى المعاملة.',
  refunded: 'مزود الدفع سجّل رد المبلغ.',
  unknown: 'تعذّر تأكيد العملية لهذه المؤسسة. راجع بيانات الاشتراك أو تحقق مرة أخرى.',
} as const;

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useOptimizedAuth();
  const { organizationId, loading: organizationLoading } = useOrganization();
  const queryClient = useQueryClient();
  const [checkRun, setCheckRun] = useState(0);
  const references = user && organizationId ? getSubscriptionCheckoutReferences(params, user.id, organizationId) : null;
  const enabled = Boolean(user && organizationId && references && !authLoading && !organizationLoading);
  const payment = useQuery<CheckoutResult | null>({
    queryKey: ['subscription-checkout-return', user?.id, organizationId, references, checkRun],
    enabled,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: ({ state }) => {
      const waiting = !state.data || state.data.state === 'pending';
      const checks = state.dataUpdateCount + state.errorUpdateCount;
      return waiting && checks < maxChecks ? checkInterval : false;
    },
    queryFn: async ({ signal }) => {
      if (!organizationId || !references) return null;
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      const timeout = window.setTimeout(abort, requestTimeout);
      try {
        const { data, error } = await supabase.rpc('get_subscription_checkout_return', {
          _organization_id: organizationId,
          ...references,
        }).abortSignal(controller.signal);
        if (error) throw error;
        return readCheckoutResult(data);
      } finally {
        window.clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
      }
    },
  });

  const result = enabled ? payment.data : null;
  const state = result?.state;
  useEffect(() => {
    if (!organizationId || (state !== 'activated' && state !== 'paid')) return;
    void queryClient.invalidateQueries({ queryKey: ['subscription-status', organizationId] });
    void queryClient.invalidateQueries({ queryKey: ['my-subscription-full', organizationId] });
    void queryClient.invalidateQueries({ queryKey: ['my-payment-transactions', organizationId] });
    void queryClient.invalidateQueries({ queryKey: ['current-subscription', organizationId] });
  }, [organizationId, queryClient, state]);

  const confirmed = result && (result.state === 'activated' || result.state === 'paid') ? result : null;
  const loading = authLoading || organizationLoading || (enabled && payment.isLoading);
  const canCheckAgain = enabled && !payment.isFetching && (!state || state === 'pending');
  const subtitle = confirmed
    ? confirmed.state === 'activated' ? 'تم تأكيد تفعيل الاشتراك لهذه العملية.' : 'تم تأكيد هذه العملية. راجع حالة اشتراكك الحالية.'
    : descriptions[state && state in descriptions ? state as keyof typeof descriptions : 'unknown'];

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8" dir="rtl">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mb-3 flex justify-center">
            {loading ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : confirmed
              ? <CheckCircle2 className="h-12 w-12 text-green-600" />
              : state === 'pending' ? <Clock3 className="h-12 w-12 text-muted-foreground" />
                : <AlertCircle className="h-12 w-12 text-muted-foreground" />}
          </div>
          <CardTitle>
            {loading ? 'جارٍ التحقق من حالة الدفع…' : confirmed
              ? confirmed.is_test ? 'تم التحقق من دفعة اختبارية' : 'تم تأكيد الدفع'
              : state === 'pending' ? 'الدفع قيد التحقق' : 'حالة الدفع'}
          </CardTitle>
        </CardHeader>
        {!loading && (
          <CardContent className="space-y-4">
            <p role="status" className="text-muted-foreground">{subtitle}</p>
            {confirmed && (
              <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                {confirmed.is_test && <p>هذه معاملة اختبارية ولم يُخصم مبلغ حقيقي.</p>}
                <p>المبلغ: {(confirmed.amount_cents / 100).toLocaleString('ar-EG')} ج.م</p>
                <p>رقم المعاملة: <bdi className="font-mono">{confirmed.transaction_id}</bdi></p>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild><Link to="/subscription">إدارة الاشتراك</Link></Button>
              {canCheckAgain && (
                <Button variant="outline" onClick={() => setCheckRun((run) => run + 1)}>التحقق مرة أخرى</Button>
              )}
              {(state === 'failed' || state === 'expired') && (
                <Button variant="outline" asChild><Link to="/pricing">عرض الخطط</Link></Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
