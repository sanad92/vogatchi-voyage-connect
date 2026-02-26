import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const SubscriptionBanner = () => {
  const { subscription, isExpired, isActive, loading } = useSubscriptionEnforcement();

  if (loading || !subscription) return null;

  if (isExpired) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>الاشتراك منتهٍ</AlertTitle>
        <AlertDescription>
          انتهت صلاحية اشتراكك. لا يمكن إجراء عمليات جديدة حتى يتم تجديد الاشتراك.
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
