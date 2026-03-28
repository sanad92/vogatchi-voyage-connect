import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Shield, Users, ClipboardList, BarChart3, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import UnifiedUserEmployeeManagement from '@/components/admin/UnifiedUserEmployeeManagement';
import AuditLogTab from '@/components/admin/AuditLogTab';
import PerformanceMonitorTab from '@/components/admin/PerformanceMonitorTab';

const tabs = [
  { value: 'unified-management', label: 'إدارة المستخدمين', icon: Users, description: 'إدارة موحدة للمستخدمين والموظفين' },
  { value: 'audit', label: 'سجل العمليات', icon: ClipboardList, description: 'سجل مفصل لجميع العمليات' },
  { value: 'performance', label: 'مراقبة الأداء', icon: BarChart3, description: 'مراقبة أداء النظام والتحليلات' },
];

const AdminSettings = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState('unified-management');
  const [searchTerm, setSearchTerm] = useState('');

  if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">ليس لديك صلاحية</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                هذه الصفحة متاحة للأدمن والمديرين فقط. يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredTabs = tabs.filter(
    (t) => t.label.includes(searchTerm) || t.description.includes(searchTerm)
  );

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">إعدادات المؤسسة</h1>
              <p className="text-muted-foreground text-sm">إدارة إعدادات المؤسسة والفريق</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300">
            {filteredTabs.length} أداة
          </Badge>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث في الأدوات الإدارية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/70 border-border/50 focus:bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`p-4 rounded-lg text-right transition-all duration-200 border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]'
                    : 'bg-card border-border hover:bg-accent hover:shadow-md'
                }`}
              >
                <Icon className={`h-5 w-5 mb-2 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <h4 className={`font-medium text-sm ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{tab.label}</h4>
                <p className={`text-xs mt-1 ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{tab.description}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <TabsContent value="unified-management" className="mt-0"><UnifiedUserEmployeeManagement /></TabsContent>
          <TabsContent value="audit" className="mt-0"><AuditLogTab /></TabsContent>
          <TabsContent value="performance" className="mt-0"><PerformanceMonitorTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
