
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeadphonesIcon, CalendarDays, Users, MessageSquare, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TodayTasks from '@/components/customer-service/TodayTasks';
import { useCustomerService } from '@/hooks/useCustomerService';

const CustomerService = () => {
  const { followUps, todayTasks } = useCustomerService();

  const pendingCount = todayTasks?.filter(task => task.status === 'pending').length || 0;
  const inProgressCount = todayTasks?.filter(task => task.status === 'in_progress').length || 0;
  const totalTodayTasks = todayTasks?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <HeadphonesIcon className="h-8 w-8 text-blue-600" />
              نظام خدمة العملاء
            </h1>
            <p className="text-gray-600 mt-2">متابعة شاملة لجميع العملاء والحجوزات</p>
          </div>
          
          <div className="flex gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">مهام اليوم</p>
                  <p className="text-2xl font-bold">{totalTodayTasks}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">في الانتظار</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              مهام اليوم
            </TabsTrigger>
            <TabsTrigger value="all-tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              جميع المهام
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              العملاء
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              التواصل
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              التقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <TodayTasks />
          </TabsContent>

          <TabsContent value="all-tasks">
            <Card>
              <CardHeader>
                <CardTitle>جميع مهام المتابعة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">قريباً... سيتم عرض جميع مهام المتابعة هنا</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>إدارة العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">قريباً... سيتم عرض ملفات العملاء الشاملة هنا</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications">
            <Card>
              <CardHeader>
                <CardTitle>سجل التواصل</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">قريباً... سيتم عرض سجل التواصل مع العملاء هنا</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>تقارير خدمة العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">قريباً... سيتم عرض تقارير الأداء والإحصائيات هنا</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerService;
