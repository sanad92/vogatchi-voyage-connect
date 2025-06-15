
import NotificationCenter from "@/components/crm/NotificationCenter";

const DashboardHeader = () => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">مرحباً بعودتك!</h1>
        <p className="text-gray-600">نظرة عامة على أداء شركتك اليوم - البيانات الحقيقية</p>
      </div>
      <div className="flex items-center gap-4">
        <NotificationCenter />
        <div className="text-sm text-gray-600">
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
