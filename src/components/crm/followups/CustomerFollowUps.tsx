
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Phone, Mail, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CustomerFollowUps = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: followUps, isLoading } = useQuery({
    queryKey: ['customer-follow-ups', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('customer_follow_ups')
        .select(`
          *,
          customer:customers(name, phone, email)
        `)
        .order('scheduled_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle className="h-4 w-4 text-green-500" />,
      pending: <Clock className="h-4 w-4 text-yellow-500" />,
      overdue: <AlertCircle className="h-4 w-4 text-red-500" />,
    };
    return icons[status] || <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpTypeIcon = (type: string) => {
    switch (type) {
      case 'phone_call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const filteredFollowUps = followUps?.filter(followUp =>
    followUp.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followUp.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">متابعة العملاء</h2>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          إضافة متابعة جديدة
        </Button>
      </div>

      {/* الفلاتر */}
      <div className="flex gap-4">
        <Input
          placeholder="البحث في المتابعات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="overdue">متأخرة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المتابعات</p>
                <p className="text-2xl font-bold">{followUps?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">قيد الانتظار</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {followUps?.filter(f => f.status === 'pending').length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مكتملة</p>
                <p className="text-2xl font-bold text-green-600">
                  {followUps?.filter(f => f.status === 'completed').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">متأخرة</p>
                <p className="text-2xl font-bold text-red-600">
                  {followUps?.filter(f => f.status === 'overdue').length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة المتابعات */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل المتابعات...</div>
        ) : filteredFollowUps?.length ? (
          filteredFollowUps.map((followUp) => (
            <Card key={followUp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getFollowUpTypeIcon(followUp.follow_up_type)}
                      <h3 className="font-semibold">{followUp.customer?.name}</h3>
                      <Badge className={getStatusColor(followUp.status)}>
                        {getStatusIcon(followUp.status)}
                        <span className="mr-1">
                          {followUp.status === 'completed' ? 'مكتملة' :
                           followUp.status === 'pending' ? 'قيد الانتظار' :
                           followUp.status === 'overdue' ? 'متأخرة' : followUp.status}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>📞 {followUp.customer?.phone}</div>
                      {followUp.customer?.email && <div>📧 {followUp.customer.email}</div>}
                      <div>📅 موعد المتابعة: {format(new Date(followUp.scheduled_date), 'PPP', { locale: ar })}</div>
                      {followUp.assigned_to && (
                         <div>👤 مسؤول المتابعة: {followUp.assigned_to}</div>
                      )}
                    </div>
                    
                    {followUp.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <strong>ملاحظات:</strong> {followUp.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      تعديل
                    </Button>
                    {followUp.status !== 'completed' && (
                      <Button size="sm">
                        تمت المتابعة
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد متابعات</h3>
              <p className="text-gray-600 mb-4">لم يتم العثور على متابعات تطابق المعايير المحددة</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerFollowUps;
