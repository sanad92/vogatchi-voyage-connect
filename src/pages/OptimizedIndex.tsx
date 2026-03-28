import React from 'react';
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useOptimizedDashboard } from "@/hooks/useOptimizedDashboard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EnhancedStatsCards from "@/components/dashboard/EnhancedStatsCards";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RevenueChart from "@/components/dashboard/RevenueChart";
import BookingsTable from "@/components/dashboard/BookingsTable";
import RecentActivity from "@/components/dashboard/RecentActivity";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const DashboardSkeleton = () => (
  <div className="space-y-6 p-4 lg:p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[130px] rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-[350px] w-full rounded-xl" />
  </div>
);

const OptimizedIndex = () => {
  const { user } = useOptimizedAuth();
  const { dashboardData, isLoading, error } = useOptimizedDashboard();

  if (error) {
    return (
      <div className="p-4 lg:p-6">
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

  const { realStats, customers } = dashboardData || {
    realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0, netProfit: 0 },
    customers: []
  };

  return (
    <OptimizedErrorBoundary>
      <div className="p-4 lg:p-6 space-y-6" dir="rtl">
        <DashboardHeader />

        <EnhancedStatsCards realStats={realStats} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <OptimizedErrorBoundary>
            <RevenueChart />
          </OptimizedErrorBoundary>
          <div className="space-y-6">
            <OptimizedErrorBoundary>
              <TodayOverview />
            </OptimizedErrorBoundary>
          </div>
        </div>

        <OptimizedErrorBoundary>
          <BookingsTable />
        </OptimizedErrorBoundary>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <OptimizedErrorBoundary>
            <QuickActions />
          </OptimizedErrorBoundary>
          <OptimizedErrorBoundary>
            <RecentActivity />
          </OptimizedErrorBoundary>
        </div>
      </div>
    </OptimizedErrorBoundary>
  );
};

export default OptimizedIndex;
