import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import EnhancedStatsCards from '@/components/dashboard/EnhancedStatsCards';
import CRMStatsCards from '@/components/dashboard/CRMStatsCards';
import ProductTour, { useProductTour } from '@/components/onboarding/ProductTour';
import TodayOverview from '@/components/dashboard/TodayOverview';
import QuickActions from '@/components/dashboard/QuickActions';
import RevenueChart from '@/components/dashboard/RevenueChart';
import BookingsTable from '@/components/dashboard/BookingsTable';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const DashboardSkeleton = () => (
  <div className="space-y-6 p-4 lg:p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <Skeleton className="h-[350px] w-full rounded-xl" />
    <Skeleton className="h-[300px] w-full rounded-xl" />
  </div>
);

const OptimizedIndex = () => {
  const { dashboardData, isLoading, error } = useOptimizedDashboard();
  const { showTour, completeTour } = useProductTour();

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive mb-4">
            {'\u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0627\u0634\u0628\u0648\u0631\u062f. \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629.'}
          </AlertDescription>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 ml-2" />
            {'\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644'}
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  const { realStats, customers, recentBookings, monthlyRevenue, revenueYear } = dashboardData || {
    realStats: {
      totalBookings: 0,
      totalRevenue: 0,
      activeCustomers: 0,
      monthlyGrowth: 0,
      flightBookings: 0,
      pendingFollowUps: 0,
    },
    customers: [],
    recentBookings: [],
    monthlyRevenue: [],
    revenueYear: new Date().getFullYear().toString(),
  };

  return (
    <ErrorBoundary>
      {showTour && <ProductTour onComplete={completeTour} />}
      <div className="p-4 lg:p-6 space-y-6" dir="rtl">
        <DashboardHeader />

        <EnhancedStatsCards realStats={realStats} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ErrorBoundary>
            <RevenueChart data={monthlyRevenue} yearLabel={revenueYear} />
          </ErrorBoundary>
          <div className="space-y-6">
            <ErrorBoundary>
              <TodayOverview />
            </ErrorBoundary>
          </div>
        </div>

        <ErrorBoundary>
          <BookingsTable bookings={recentBookings} />
        </ErrorBoundary>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ErrorBoundary>
            <QuickActions />
          </ErrorBoundary>
          <ErrorBoundary>
            <RecentActivity />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <CRMStatsCards customers={customers} realStats={realStats} />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedIndex;
