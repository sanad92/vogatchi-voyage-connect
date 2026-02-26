import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  CreditCard, Calendar, ArrowUpCircle, XCircle, Download,
  Loader2, CheckCircle2, Clock, Shield, AlertTriangle,
  FileText, Sparkles, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SubscriptionManagement = () => {
  const { user } = useOptimizedAuth();
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { subscription, loading: subLoading, refetch: refetchSub } = useSubscriptionEnforcement();

  // Fetch full subscription record with plan details
  const { data: currentSub, isLoading } = useQuery({
    queryKey: ['my-subscription-full', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch all plans for upgrade
  const { data: allPlans } = useQuery({
    queryKey: ['all-plans-for-upgrade'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      return data ?? [];
    },
  });

  // Fetch payment transactions for invoices
  const { data: transactions } = useQuery({
    queryKey: ['my-payment-transactions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!currentSub?.id) throw new Error('لا يوجد اشتراك');
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', currentSub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إلغاء الاشتراك. ستستمر في الوصول حتى تاريخ الانتهاء.');
      queryClient.invalidateQueries({ queryKey: ['my-subscription-full'] });
      refetchSub();
    },
    onError: (err: any) => toast.error(err.message || 'فشل في إلغاء الاشتراك'),
  });

  const plan = (currentSub as any)?.subscription_plans;
  const status = currentSub?.status;
  const expiresAt = currentSub?.expires_at;

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
    active: { label: 'نشط', variant: 'default', icon: CheckCircle2 },
    trialing: { label: 'فترة تجريبية', variant: 'secondary', icon: Clock },
    expired: { label: 'منتهي', variant: 'destructive', icon: XCircle },
    cancelled: { label: 'ملغي', variant: 'destructive', icon: XCircle },
  };

  const currentStatus = statusConfig[status ?? ''] || { label: 'غير محدد', variant: 'outline' as const, icon: AlertTriangle };
  const StatusIcon = currentStatus.icon;

  const isLoadingAll = isLoading || subLoading;

  if (isLoadingAll) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراك</h1>
        <p className="text-muted-foreground mt-1">عرض وإدارة خطة اشتراكك الحالية</p>
      </div>

      <div className="space-y-6">
        {/* Current Plan Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                خطتك الحالية
              </CardTitle>
              <Badge variant={currentStatus.variant} className="gap-1.5 px-3 py-1">
                <StatusIcon className="h-3.5 w-3.5" />
                {currentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {plan ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">اسم الخطة</span>
                  <span className="text-xl font-bold text-foreground">{plan.name_ar || plan.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    تاريخ التجديد / الانتهاء
                  </span>
                  <span className="font-semibold text-foreground">
                    {expiresAt
                      ? format(new Date(expiresAt), 'dd MMMM yyyy', { locale: ar })
                      : 'غير محدد'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">السعر الشهري</span>
                  <span className="font-semibold text-foreground">
                    {plan.price_monthly === 0 ? 'مجاني' : `${plan.price_monthly?.toLocaleString('ar-EG')} ج.م/شهر`}
                  </span>
                </div>

                <Separator />

                {/* Usage */}
                {subscription && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">المستخدمون</p>
                      <p className="text-2xl font-bold text-foreground">
                        {subscription.usage.users}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{subscription.limits.max_users >= 50 ? '∞' : subscription.limits.max_users}
                        </span>
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">الحجوزات هذا الشهر</p>
                      <p className="text-2xl font-bold text-foreground">
                        {subscription.usage.bookings_this_month}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{subscription.limits.max_bookings >= 9999 ? '∞' : subscription.limits.max_bookings}
                        </span>
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">التخزين</p>
                      <p className="text-2xl font-bold text-foreground">
                        {subscription.limits.max_storage_mb}
                        <span className="text-sm font-normal text-muted-foreground"> MB</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا يوجد اشتراك حالي</p>
                <Link to="/pricing">
                  <Button className="mt-4">اختر خطة</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Section */}
        {plan && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-primary" />
                ترقية الخطة
              </CardTitle>
              <CardDescription>اختر خطة أعلى للحصول على ميزات وحدود أكبر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allPlans
                  ?.filter((p) => p.price_monthly > (plan?.price_monthly ?? 0))
                  .map((upgradePlan) => (
                    <div
                      key={upgradePlan.id}
                      className="border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-foreground">{upgradePlan.name_ar || upgradePlan.name}</h4>
                        {upgradePlan.name === 'Pro' && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 ml-1" />
                            موصى
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary mb-1">
                        {upgradePlan.price_monthly?.toLocaleString('ar-EG')} ج.م
                        <span className="text-xs font-normal text-muted-foreground">/شهر</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {upgradePlan.max_users >= 50 ? 'مستخدمون غير محدودين' : `${upgradePlan.max_users} مستخدم`}
                        {' • '}
                        {upgradePlan.max_bookings_per_month >= 9999 ? 'حجوزات غير محدودة' : `${upgradePlan.max_bookings_per_month} حجز/شهر`}
                      </p>
                      <Link to={`/payment?plan=${upgradePlan.id}&billing=monthly`}>
                        <Button size="sm" className="w-full">
                          ترقية
                          <ArrowUpCircle className="h-4 w-4 mr-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                {allPlans?.filter((p) => p.price_monthly > (plan?.price_monthly ?? 0)).length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-4">
                    أنت على أعلى خطة متاحة حالياً 🎉
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History / Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              سجل المدفوعات والفواتير
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        tx.status === 'success' ? 'bg-green-100 text-green-600' :
                        tx.status === 'failed' ? 'bg-red-100 text-red-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {tx.status === 'success' ? <CheckCircle2 className="h-5 w-5" /> :
                         tx.status === 'failed' ? <XCircle className="h-5 w-5" /> :
                         <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {tx.amount_cents ? `${(tx.amount_cents / 100).toLocaleString('ar-EG')} ج.م` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.created_at ? format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar }) : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
                        {tx.status === 'success' ? 'ناجح' : tx.status === 'failed' ? 'فشل' : 'معلق'}
                      </Badge>
                      {tx.status === 'success' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // Generate simple receipt
                            const receiptData = `
فاتورة دفع - Vogatchi CRM
================================
رقم المعاملة: ${tx.paymob_transaction_id || tx.id}
المبلغ: ${(tx.amount_cents / 100).toLocaleString('ar-EG')} ج.م
العملة: ${tx.currency || 'EGP'}
التاريخ: ${tx.created_at ? format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm') : ''}
الحالة: ناجح
================================
`;
                            const blob = new Blob([receiptData], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `invoice-${tx.paymob_transaction_id || tx.id}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('تم تحميل الفاتورة');
                          }}
                          title="تحميل الفاتورة"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد مدفوعات سابقة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Subscription */}
        {currentSub && status !== 'cancelled' && status !== 'expired' && plan?.price_monthly > 0 && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                إلغاء الاشتراك
              </CardTitle>
              <CardDescription>
                بعد الإلغاء، ستستمر في الوصول للنظام حتى تاريخ انتهاء الاشتراك الحالي.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : null}
                    إلغاء الاشتراك
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد من إلغاء الاشتراك؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم إلغاء اشتراكك في خطة "{plan?.name_ar || plan?.name}".
                      ستتمكن من الوصول للنظام حتى{' '}
                      {expiresAt ? format(new Date(expiresAt), 'dd MMMM yyyy', { locale: ar }) : 'تاريخ الانتهاء'}.
                      بعد ذلك سيتم تقييد الوصول.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel>تراجع</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      تأكيد الإلغاء
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Renew after cancellation */}
        {status === 'cancelled' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6 text-center">
              <RefreshCw className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-2">أعد تفعيل اشتراكك</h3>
              <p className="text-muted-foreground mb-4">اختر خطة جديدة لاستعادة الوصول الكامل للنظام</p>
              <Link to="/pricing">
                <Button>
                  عرض الخطط المتاحة
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
