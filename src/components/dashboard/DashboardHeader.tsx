import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const DashboardHeader = () => {
  const { profile } = useOptimizedAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'المستخدم';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  const dateLabel = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">
        {getGreeting()}، {firstName}
      </h1>
      <p className="text-sm text-muted-foreground">
        نظرة عامة • {dateLabel}
      </p>
    </div>
  );
};

export default DashboardHeader;
