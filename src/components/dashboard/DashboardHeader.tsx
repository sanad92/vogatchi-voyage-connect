
import NotificationCenter from "@/components/crm/NotificationCenter";

const DashboardHeader = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">مرحباً بعودتك! 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">نظرة عامة على أداء شركتك اليوم</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs sm:text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
