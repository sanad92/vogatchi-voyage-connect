import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Info } from 'lucide-react';
import { useSubscriptionEnforcement } from '@/hooks/useSubscriptionEnforcement';

const SeatUsageBar = () => {
  const { subscription, loading } = useSubscriptionEnforcement();

  if (loading || !subscription) return null;

  const max = subscription.limits?.max_users ?? 0;
  const used = subscription.usage?.users ?? 0;
  const available = Math.max(0, max - used);
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4 text-primary" />
            مقاعد الاشتراك — خطة {subscription.plan_name_ar || subscription.plan_name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">المستخدم: {used}</Badge>
            <Badge variant="outline">الحد: {max}</Badge>
            <Badge variant={available > 0 ? 'default' : 'destructive'}>المتاح: {available}</Badge>
          </div>
        </div>

        <Progress value={pct} className="h-2" />

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            المقعد يُحسب على الأعضاء النشطين فقط. عند إنهاء خدمة موظف يتحرر مقعده فوراً ويمكنك إضافة موظف جديد
            بدون ترقية الخطة.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeatUsageBar;
