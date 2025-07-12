
import React from 'react';
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useOptimizedDashboard } from "@/hooks/useOptimizedDashboard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MainStatsCards from "@/components/dashboard/MainStatsCards";
import CRMStatsCards from "@/components/dashboard/CRMStatsCards";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RealTimeAnalytics from "@/components/dashboard/RealTimeAnalytics";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OptimizedIndex = () => {
  const { user } = useOptimizedAuth();
  const { dashboardData, isLoading, error } = useOptimizedDashboard();

  console.log('🏠 Dashboard render:', { user: !!user, dashboardData: !!dashboardData, isLoading, error: !!error });

  if (error) {
    console.error('❌ Dashboard error:', error);
    return (
      <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 mb-4">
            حدث خطأ في تحميل بيانات الداشبورد. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تحميل
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">جارٍ تحميل البيانات...</p>
            <p className="text-sm text-gray-500">قد يستغرق هذا عدة ثوانِ</p>
          </div>
        </div>
      </div>
    );
  }

  // استخدام بيانات افتراضية إذا لم تكن متوفرة
  const { realStats, crmStats, customers } = dashboardData || {
    realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0 },
    crmStats: { vipCustomers: 0, loyaltyPoints: 0 },
    customers: []
  };

  return (
    <ErrorBoundary>
      <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <DashboardHeader />

        <MainStatsCards realStats={realStats} />

        <CRMStatsCards customers={customers} realStats={realStats} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <ErrorBoundary>
            <TodayOverview />
          </ErrorBoundary>
          <ErrorBoundary>
            <QuickActions />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <RealTimeAnalytics realStats={realStats} crmStats={crmStats} />
        </ErrorBoundary>

        <ErrorBoundary>
          <RecentActivity />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedIndex;
