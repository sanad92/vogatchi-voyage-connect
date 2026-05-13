import React from 'react';
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useOptimizedDashboard } from "@/hooks/useOptimizedDashboard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EnhancedStatsCards from "@/components/dashboard/EnhancedStatsCards";
import AlertsStrip from "@/components/dashboard/AlertsStrip";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RevenueChart from "@/components/dashboard/RevenueChart";
import BookingsTable from "@/components/dashboard/BookingsTable";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="space-y-6 p-4 lg:p-8 max-w-[1600px] mx-auto">
    <div className="space-y-2">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-[80px] rounded-2xl" />
    <Skeleton className="h-[340px] w-full rounded-2xl" />
  </div>
);

const OptimizedIndex = () => {
  const { user } = useOptimizedAuth();
  const { dashboardData, isLoading, error } = useOptimizedDashboard();

  if (error) {
    return (
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive mb-4">
            حدث خطأ في تحميل بيانات الداشبورد. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 ml-2" />
            إعادة تحميل
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  const { realStats, alerts, today } = dashboardData || {
    realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0, netProfit: 0 },
    alerts: { outstandingAmount: 0, outstandingCount: 0, checkoutsToday: 0 },
    today: { todayBookingsCount: 0, weekBookingsCount: 0, newCustomersToday: 0 },
  };

  return (
    <OptimizedErrorBoundary>
      <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto" dir="rtl">
        <DashboardHeader />

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            القيم الإجمالية في هذه الصفحة معروضة بالجنيه المصري كمعادل تقريبي.
            للحصول على أرقام مفصّلة لكل عملة، استخدم صفحة <strong>التقارير المالية المحسّنة</strong>.
          </AlertDescription>
        </Alert>

        <EnhancedStatsCards realStats={realStats} alerts={alerts} today={today} />

        <AlertsStrip
          outstandingCount={alerts?.outstandingCount || 0}
          checkoutsToday={alerts?.checkoutsToday || 0}
        />

        <OptimizedErrorBoundary>
          <QuickActions />
        </OptimizedErrorBoundary>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <OptimizedErrorBoundary>
            <RevenueChart />
          </OptimizedErrorBoundary>
          <OptimizedErrorBoundary>
            <TodayOverview
              todayBookings={today?.todayBookingsCount || 0}
              weekBookings={today?.weekBookingsCount || 0}
              newCustomers={today?.newCustomersToday || 0}
            />
          </OptimizedErrorBoundary>
        </div>

        <OptimizedErrorBoundary>
          <BookingsTable />
        </OptimizedErrorBoundary>
      </div>
    </OptimizedErrorBoundary>
  );
};

export default OptimizedIndex;
