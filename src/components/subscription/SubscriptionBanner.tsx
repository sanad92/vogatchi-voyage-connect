import { Link } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertTriangle, XCircle, Clock, Sparkles, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const SubscriptionBanner = () => {
  const { subscription, isExpired, isActive, isTrialing, trialDaysRemaining, loading } = useSubscription();
  const { orgRole } = useOrganization();

  if (loading || !subscription) return null;

  // Trial banner
  if (isTrialing && isActive && !isExpired) {
    const urgency = trialDaysRemaining === null || trialDaysRemaining > 3
      ? 'info'
      : trialDaysRemaining <= 1 ? 'destructive' : 'warning';
    // Match the purchase permissions in prepare_subscription_checkout and create-payment.
    const canPurchase = orgRole === 'owner' || orgRole === 'manager';
    const startsAt = Date.parse(subscription.starts_at ?? '');
    const expiresAt = Date.parse(subscription.expires_at ?? '');
    const duration = expiresAt - startsAt;
    const trialPercent = duration > 0
      ? Math.min(100, Math.max(0, ((Date.now() - startsAt) / duration) * 100))
      : null;

    return (
      <Alert className={`mx-4 mt-4 ${
        urgency === 'destructive' 
          ? 'border-destructive/50 bg-destructive/10' 
          : urgency === 'warning'
          ? 'border-amber-500/50 bg-amber-500/10'
          : 'border-primary/50 bg-primary/10'
      }`}>
        <Clock className={`h-4 w-4 ${
          urgency === 'destructive' ? 'text-destructive' : urgency === 'warning' ? 'text-amber-500' : 'text-primary'
        }`} />
        <AlertTitle className={
          urgency === 'destructive' ? 'text-destructive' : urgency === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-primary'
        }>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            الفترة التجريبية المجانية
          </div>
        </AlertTitle>
        <AlertDescription className="space-y-3 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {trialDaysRemaining === null ? (
                'تجربتك المجانية مفعّلة'
              ) : (
                <>متبقي <strong className="text-foreground">{trialDaysRemaining} {trialDaysRemaining === 1 ? 'يوم' : 'أيام'}</strong> من الفترة التجريبية</>
              )}
              {' '}— خطة <strong>{subscription.plan_name_ar || subscription.plan_name}</strong>
            </p>
            {canPurchase && (
              <Button asChild size="sm" variant={urgency === 'destructive' ? 'destructive' : 'default'}>
                <Link to="/pricing">
                  <CreditCard aria-hidden="true" />
                  اشترك وادفع الآن
                </Link>
              </Button>
            )}
          </div>
          {trialPercent !== null && <Progress value={trialPercent} className="h-2" />}
          <p className="text-xs text-muted-foreground">
            {urgency !== 'info'
              ? 'ستفقد إمكانية التعديل على البيانات بعد انتهاء التجربة!'
              : 'استمتع بجميع الميزات مجاناً خلال الفترة التجريبية.'}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpired) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>الاشتراك منتهٍ</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>انتهت صلاحية اشتراكك. لا يمكن إجراء عمليات جديدة حتى يتم تجديد الاشتراك.</span>
          <Link to="/pricing">
            <Button size="sm" variant="outline" className="mr-2">
              ترقية الآن
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isActive) return null;

  const userPercent = subscription.limits.max_users > 0
    ? (subscription.usage.users / subscription.limits.max_users) * 100
    : 0;
  const bookingPercent = subscription.limits.max_bookings > 0
    ? (subscription.usage.bookings_this_month / subscription.limits.max_bookings) * 100
    : 0;

  const showWarning = userPercent >= 80 || bookingPercent >= 80;
  if (!showWarning) return null;

  return (
    <Alert className="mx-4 mt-4 border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-700 dark:text-amber-400">تنبيه حدود الاشتراك</AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-sm text-muted-foreground">
          خطة <strong>{subscription.plan_name_ar}</strong> — أنت قريب من حدود الاستخدام.
        </p>
        {userPercent >= 80 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>المستخدمون</span>
              <span>{subscription.usage.users} / {subscription.limits.max_users}</span>
            </div>
            <Progress value={userPercent} className="h-2" />
          </div>
        )}
        {bookingPercent >= 80 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>الحجوزات الشهرية</span>
              <span>{subscription.usage.bookings_this_month} / {subscription.limits.max_bookings}</span>
            </div>
            <Progress value={bookingPercent} className="h-2" />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SubscriptionBanner;
