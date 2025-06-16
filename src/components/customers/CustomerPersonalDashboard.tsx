
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  Bell, 
  Star, 
  TrendingUp,
  MessageCircle,
  Target,
  Award
} from "lucide-react";
import { useCustomerService } from "@/hooks/useCustomerService";
import { Customer } from "@/types/customer";

interface CustomerPersonalDashboardProps {
  customers: Customer[];
}

const CustomerPersonalDashboard = ({ customers }: CustomerPersonalDashboardProps) => {
  const { todayFollowUps, overdueFollowUps } = useCustomerService();

  // Calculate personal stats
  const myCustomers = customers.length;
  const vipCustomers = customers.filter(c => 
    c.segment?.name === 'VIP' || c.total_spent > 50000
  ).length;
  
  const activeCustomers = customers.filter(c => 
    c.last_booking_date && 
    new Date(c.last_booking_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  ).length;

  const todayTasks = todayFollowUps?.length || 0;
  const overdueTasks = overdueFollowUps?.length || 0;

  // Quick actions for today
  const quickActions = [
    {
      title: "متابعة العملاء المميزين",
      description: `${vipCustomers} عميل VIP`,
      icon: Star,
      color: "bg-yellow-100 text-yellow-800",
      action: () => console.log("VIP customers")
    },
    {
      title: "العملاء النشطين",
      description: `${activeCustomers} عميل نشط`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-800",
      action: () => console.log("Active customers")
    },
    {
      title: "رسائل واتساب",
      description: "تواصل سريع",
      icon: MessageCircle,
      color: "bg-blue-100 text-blue-800",
      action: () => console.log("WhatsApp")
    }
  ];

  // Today's priorities
  const todayPriorities = [
    {
      title: "متابعة العملاء الجدد",
      count: customers.filter(c => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(c.created_at || '') > thirtyDaysAgo;
      }).length,
      priority: "عالية",
      color: "bg-red-100 text-red-800"
    },
    {
      title: "العملاء بدون تواصل",
      count: customers.filter(c => c.total_bookings === 0).length,
      priority: "متوسطة",
      color: "bg-orange-100 text-orange-800"
    },
    {
      title: "تجديد بيانات العملاء",
      count: customers.filter(c => !c.email).length,
      priority: "منخفضة",
      color: "bg-blue-100 text-blue-800"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myCustomers}</p>
                <p className="text-sm text-gray-600">عملائي</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vipCustomers}</p>
                <p className="text-sm text-gray-600">عملاء VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayTasks}</p>
                <p className="text-sm text-gray-600">مهام اليوم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${overdueTasks > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Bell className={`h-5 w-5 ${overdueTasks > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-sm text-gray-600">متأخرة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={action.action}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`p-2 rounded-full ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            أولويات اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayPriorities.map((priority, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{priority.title}</span>
                    <Badge variant="secondary">{priority.count}</Badge>
                  </div>
                </div>
                <Badge className={priority.color}>
                  {priority.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerPersonalDashboard;
