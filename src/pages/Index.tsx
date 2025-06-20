
import React from 'react';
import { useAuthState } from "@/hooks/useAuthState";
import { useCRM } from "@/hooks/useCRM";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MainStatsCards from "@/components/dashboard/MainStatsCards";
import CRMStatsCards from "@/components/dashboard/CRMStatsCards";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RealTimeAnalytics from "@/components/dashboard/RealTimeAnalytics";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { useRealTimeStats } from "@/components/dashboard/RealTimeStats";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Index = () => {
  const { user } = useAuthState();
  const { customerSegments } = useCRM();
  const { realStats, customers, isLoading, error } = useRealTimeStats();

  // معالجة حالة الخطأ
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            حدث خطأ في تحميل بيانات الداشبورد. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // حساب إحصائيات CRM الحقيقية
  const calculateCRMStats = () => {
    if (!customers || !customerSegments) return { vipCustomers: 0, loyaltyPoints: 0 };

    const vipSegment = customerSegments.find(s => s.name === 'VIP' || s.name_ar === 'VIP');
    const vipCustomers = vipSegment 
      ? customers.filter(c => c.segment_id === vipSegment.id).length 
      : customers.filter(c => c.total_bookings >= 10).length;

    const loyaltyPoints = customers.reduce((sum, customer) => 
      sum + (customer.loyalty_points || 0), 0
    );

    return { vipCustomers, loyaltyPoints };
  };

  const crmStats = calculateCRMStats();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader />

        {/* المؤشرات الرئيسية المحدثة بالبيانات الحقيقية */}
        <MainStatsCards realStats={realStats} />

        {/* مؤشرات CRM الحقيقية */}
        <CRMStatsCards customers={customers} realStats={realStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayOverview />
          <QuickActions />
        </div>

        {/* قسم التحليلات المحدث بالبيانات الحقيقية */}
        <RealTimeAnalytics realStats={realStats} crmStats={crmStats} />

        <RecentActivity />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
