import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getRequiredPlanFeature, PLAN_FEATURE_LABELS } from '@/lib/planFeatures';

const PlanAccessGuard = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { hasFeature, loading } = useSubscription();
  const rule = getRequiredPlanFeature(location.pathname);

  if (loading || !rule || hasFeature(rule.feature)) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center p-6" dir="rtl">
      <div className="w-full rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-950/5 sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          متاح من خطة {rule.minimumPlan}
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl">
          {PLAN_FEATURE_LABELS[rule.feature]}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          الموديول غير مشمول في خطتك الحالية. يمكنك ترقية الاشتراك فورًا مع الاحتفاظ بكل بيانات شركتك وإعدادات فريقك.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/pricing">
            <Button size="lg" className="w-full rounded-xl px-7 font-bold sm:w-auto">
              قارن الخطط
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/subscription">
            <Button size="lg" variant="outline" className="w-full rounded-xl px-7 font-bold sm:w-auto">
              إدارة الاشتراك
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlanAccessGuard;
