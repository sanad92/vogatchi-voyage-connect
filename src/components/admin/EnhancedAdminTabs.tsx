
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

interface TabGroup {
  id: string;
  title: string;
  description: string;
  tabs: {
    value: string;
    label: string;
    icon: any;
    description: string;
    disabled?: boolean;
  }[];
}

interface EnhancedAdminTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isSuperAdmin: boolean;
}

const EnhancedAdminTabs = ({ activeTab, onTabChange, isSuperAdmin }: EnhancedAdminTabsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const tabGroups: TabGroup[] = [
    {
      id: 'management',
      title: 'إدارة المستخدمين',
      description: 'إدارة شاملة للمستخدمين والموظفين',
      tabs: [
        {
          value: 'unified-management',
          label: 'الإدارة الموحدة',
          icon: '👥',
          description: 'إدارة موحدة للمستخدمين والموظفين'
        },
        {
          value: 'users',
          label: 'المستخدمين',
          icon: '👤',
          description: 'إدارة حسابات المستخدمين'
        }
      ]
    },
    {
      id: 'content',
      title: 'المحتوى والمظهر',
      description: 'تخصيص شكل ومحتوى الموقع',
      tabs: [
        {
          value: 'site',
          label: 'إعدادات الموقع',
          icon: '🎨',
          description: 'تخصيص مظهر وإعدادات الموقع'
        }
      ]
    },
    {
      id: 'monitoring',
      title: 'المراقبة والتحليل',
      description: 'مراقبة النظام وتحليل الأداء',
      tabs: [
        {
          value: 'audit',
          label: 'سجل العمليات',
          icon: '📋',
          description: 'سجل مفصل لجميع العمليات'
        },
        {
          value: 'performance',
          label: 'مراقبة الأداء',
          icon: '📊',
          description: 'مراقبة أداء النظام والتحليلات'
        }
      ]
    },
    {
      id: 'system',
      title: 'إعدادات النظام المتقدمة',
      description: 'إعدادات النظام والأمان (سوبر أدمن فقط)',
      tabs: [
        {
          value: 'backup',
          label: 'النسخ الاحتياطي',
          icon: '💾',
          description: 'إدارة النسخ الاحتياطية',
          disabled: !isSuperAdmin
        },
        {
          value: 'security',
          label: 'الأمان',
          icon: '🔒',
          description: 'إعدادات الأمان المتقدمة',
          disabled: !isSuperAdmin
        },
        {
          value: 'system',
          label: 'إعدادات النظام',
          icon: '⚙️',
          description: 'إعدادات النظام العامة',
          disabled: !isSuperAdmin
        },
        {
          value: 'permissions',
          label: 'الصلاحيات',
          icon: '🔑',
          description: 'إدارة صلاحيات المستخدمين',
          disabled: !isSuperAdmin
        }
      ]
    }
  ];

  const filteredGroups = tabGroups
    .map(group => ({
      ...group,
      tabs: group.tabs.filter(tab => 
        tab.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tab.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(group => group.tabs.length > 0);

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">لوحة التحكم الإدارية</h2>
            <p className="text-gray-600 mt-1">إدارة شاملة لجميع جوانب النظام</p>
          </div>
          <Badge variant="outline" className="bg-white/50">
            {filteredGroups.reduce((acc, group) => acc + group.tabs.length, 0)} أداة متاحة
          </Badge>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في الأدوات الإدارية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/70 border-white/50 focus:bg-white"
          />
        </div>
      </div>

      {/* Tab Groups */}
      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Group Header */}
            <div 
              className={`px-6 py-4 bg-gradient-to-r cursor-pointer transition-all duration-200 ${
                selectedGroup === group.id
                  ? 'from-blue-600 to-indigo-600 text-white'
                  : 'from-gray-50 to-gray-100 text-gray-900 hover:from-blue-50 hover:to-indigo-50'
              }`}
              onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{group.title}</h3>
                  <p className={`text-sm mt-1 ${
                    selectedGroup === group.id ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {group.description}
                  </p>
                </div>
                <Badge variant="secondary" className={`${
                  selectedGroup === group.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {group.tabs.length} أداة
                </Badge>
              </div>
            </div>

            {/* Group Tabs */}
            <div className={`transition-all duration-300 ${
              selectedGroup === group.id || selectedGroup === null ? 'block' : 'hidden'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => !tab.disabled && onTabChange(tab.value)}
                    disabled={tab.disabled}
                    className={`p-4 rounded-lg text-left transition-all duration-200 group ${
                      activeTab === tab.value
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                        : tab.disabled
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md hover:scale-102 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{tab.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${
                          activeTab === tab.value ? 'text-white' : 'text-gray-900'
                        }`}>
                          {tab.label}
                        </h4>
                        <p className={`text-xs mt-1 ${
                          activeTab === tab.value 
                            ? 'text-blue-100' 
                            : tab.disabled 
                            ? 'text-gray-400' 
                            : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </p>
                        {tab.disabled && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            سوبر أدمن فقط
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedAdminTabs;
