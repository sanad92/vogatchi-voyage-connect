import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Database, Lock, Settings, KeyRound, Globe, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import LandingPageCMS from '@/components/admin/LandingPageCMS';
import BackupManagementTab from '@/components/admin/BackupManagementTab';
import SecurityManagementTab from '@/components/admin/SecurityManagementTab';
import SystemSettingsTab from '@/components/admin/SystemSettingsTab';
import PermissionsManagement from '@/components/admin/PermissionsManagement';

const tabs = [
  { value: 'backup', label: 'النسخ الاحتياطي', icon: Database, description: 'إدارة النسخ الاحتياطية' },
  { value: 'security', label: 'الأمان', icon: Lock, description: 'إعدادات الأمان المتقدمة' },
  { value: 'system', label: 'إعدادات النظام', icon: Settings, description: 'إعدادات النظام العامة' },
  { value: 'permissions', label: 'الصلاحيات', icon: KeyRound, description: 'إدارة صلاحيات المستخدمين' },
  { value: 'landing', label: 'صفحة الهبوط', icon: Globe, description: 'إدارة محتوى صفحة الهبوط' },
];

const PlatformAdminSettings = () => {
  const [activeTab, setActiveTab] = useState('backup');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTabs = tabs.filter(
    (t) =>
      t.label.includes(searchTerm) || t.description.includes(searchTerm)
  );

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">إعدادات المنصة</h1>
              <p className="text-muted-foreground text-sm">إعدادات على مستوى المنصة — للسوبر أدمن فقط</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
            Platform Admin
          </Badge>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث في الإعدادات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/70 border-border/50 focus:bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`p-4 rounded-lg text-right transition-all duration-200 border ${
                  active
                    ? 'bg-amber-500 text-white border-amber-600 shadow-lg scale-[1.02]'
                    : 'bg-card border-border hover:bg-accent hover:shadow-md'
                }`}
              >
                <Icon className={`h-5 w-5 mb-2 ${active ? 'text-white' : 'text-muted-foreground'}`} />
                <h4 className={`font-medium text-sm ${active ? 'text-white' : 'text-foreground'}`}>{tab.label}</h4>
                <p className={`text-xs mt-1 ${active ? 'text-amber-100' : 'text-muted-foreground'}`}>{tab.description}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <TabsContent value="backup" className="mt-0"><BackupManagementTab /></TabsContent>
          <TabsContent value="security" className="mt-0"><SecurityManagementTab /></TabsContent>
          <TabsContent value="system" className="mt-0"><SystemSettingsTab /></TabsContent>
          <TabsContent value="permissions" className="mt-0"><PermissionsManagement /></TabsContent>
          <TabsContent value="landing" className="mt-0"><LandingPageCMS /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default PlatformAdminSettings;
