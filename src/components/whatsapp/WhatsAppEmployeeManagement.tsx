
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  UserPlus, 
  Search, 
  Settings,
  MessageCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  UserX
} from 'lucide-react';
import { Label } from '@/components/ui/label';

export const WhatsAppEmployeeManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // بيانات وهمية للموظفين - سيتم ربطها بقاعدة البيانات لاحقاً
  const employees = [
    {
      id: '1',
      name: 'أحمد محمد',
      email: 'ahmed@company.com',
      status: 'available',
      activeConversations: 3,
      maxConversations: 5,
      totalMessages: 156,
      responseTime: '2.5 دقيقة',
      satisfaction: 4.8,
      autoAssignment: true,
      lastActivity: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'فاطمة علي',
      email: 'fatima@company.com',
      status: 'busy',
      activeConversations: 5,
      maxConversations: 5,
      totalMessages: 142,
      responseTime: '3.1 دقيقة',
      satisfaction: 4.7,
      autoAssignment: true,
      lastActivity: '2024-01-15T10:25:00Z'
    },
    {
      id: '3',
      name: 'محمد أحمد',
      email: 'mohamed@company.com',
      status: 'away',
      activeConversations: 0,
      maxConversations: 4,
      totalMessages: 138,
      responseTime: '4.2 دقيقة',
      satisfaction: 4.6,
      autoAssignment: false,
      lastActivity: '2024-01-15T09:45:00Z'
    },
    {
      id: '4',
      name: 'سارة خالد',
      email: 'sara@company.com',
      status: 'offline',
      activeConversations: 0,
      maxConversations: 6,
      totalMessages: 125,
      responseTime: '2.8 دقيقة',
      satisfaction: 4.5,
      autoAssignment: false,
      lastActivity: '2024-01-14T18:30:00Z'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'متاح', className: 'bg-green-100 text-green-800' },
      busy: { label: 'مشغول', className: 'bg-yellow-100 text-yellow-800' },
      away: { label: 'غائب', className: 'bg-orange-100 text-orange-800' },
      offline: { label: 'غير متصل', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'busy':
        return <MessageCircle className="w-4 h-4 text-yellow-600" />;
      case 'away':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'offline':
        return <UserX className="w-4 h-4 text-gray-600" />;
      default:
        return <UserX className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employees.length,
    available: employees.filter(e => e.status === 'available').length,
    busy: employees.filter(e => e.status === 'busy').length,
    offline: employees.filter(e => e.status === 'offline').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة موظفي WhatsApp</h2>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          إضافة موظف
        </Button>
      </div>

      {/* إحصائيات الموظفين */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">إجمالي الموظفين</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.available}</div>
                <div className="text-sm text-gray-600">متاح</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.busy}</div>
                <div className="text-sm text-gray-600">مشغول</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">{stats.offline}</div>
                <div className="text-sm text-gray-600">غير متصل</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* شريط البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث عن موظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة الموظفين */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {getStatusIcon(employee.status)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{employee.name}</h3>
                      {getStatusBadge(employee.status)}
                    </div>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                    <p className="text-xs text-gray-500">
                      آخر نشاط: {new Date(employee.lastActivity).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* إحصائيات الموظف */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">{employee.activeConversations}/{employee.maxConversations}</div>
                      <div className="text-xs text-gray-500">المحادثات</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{employee.totalMessages}</div>
                      <div className="text-xs text-gray-500">الرسائل</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{employee.responseTime}</div>
                      <div className="text-xs text-gray-500">وقت الرد</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-yellow-500" />
                      <div className="text-lg font-bold">{employee.satisfaction}</div>
                    </div>
                  </div>

                  {/* إعدادات الموظف */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={employee.autoAssignment}
                        onCheckedChange={() => {}}
                      />
                      <Label className="text-sm">التوزيع التلقائي</Label>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      إعدادات
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-500">لم يتم العثور على موظفين يطابقون البحث</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
