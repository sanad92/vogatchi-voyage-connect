
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
import { AlertTriangle } from "lucide-react";

const OptimizedIndex = () => {
  const { user } = useOptimizedAuth();
  const { dashboardData, isLoading, error } = useOptimizedDashboard();

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            حدث خطأ في تحميل بيانات الداشبورد. يرجى إعادة تحميل الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

  const { realStats, crmStats, customers } = dashboardData || {
    realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0 },
    crmStats: { vipCustomers: 0, loyaltyPoints: 0 },
    customers: []
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader />

        <MainStatsCards realStats={realStats} />

        <CRMStatsCards customers={customers} realStats={realStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayOverview />
          <QuickActions />
        </div>

        <RealTimeAnalytics realStats={realStats} crmStats={crmStats} />

        <RecentActivity />
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedIndex;
