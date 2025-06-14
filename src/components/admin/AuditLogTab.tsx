
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  old_values: any;
  new_values: any;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  admin: {
    full_name: string;
    email: string;
  };
}

const AuditLogTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // جلب سجل العمليات
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:profiles!admin_audit_log_admin_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,action_type.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as AuditLog[];
    }
  });

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'user_created': return 'bg-green-100 text-green-800';
      case 'user_activated': return 'bg-blue-100 text-blue-800';
      case 'user_deactivated': return 'bg-red-100 text-red-800';
      case 'setting_updated': return 'bg-purple-100 text-purple-800';
      case 'role_changed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'user_created': return 'إنشاء مستخدم';
      case 'user_activated': return 'تفعيل مستخدم';
      case 'user_deactivated': return 'تعطيل مستخدم';
      case 'setting_updated': return 'تحديث إعداد';
      case 'role_changed': return 'تغيير دور';
      default: return actionType;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل سجل العمليات...</div>;
  }

  return (
    <div className="space-y-6">
      {/* أدوات التصفية */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في سجل العمليات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع العمليات</SelectItem>
            <SelectItem value="user_created">إنشاء مستخدم</SelectItem>
            <SelectItem value="user_activated">تفعيل مستخدم</SelectItem>
            <SelectItem value="user_deactivated">تعطيل مستخدم</SelectItem>
            <SelectItem value="setting_updated">تحديث إعداد</SelectItem>
            <SelectItem value="role_changed">تغيير دور</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* جدول سجل العمليات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            سجل العمليات ({auditLogs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العملية</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge className={getActionBadgeColor(log.action_type)}>
                      {getActionLabel(log.action_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.admin.full_name}</div>
                      <div className="text-sm text-gray-500">{log.admin.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">{log.description}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>تفاصيل العملية</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <strong>نوع العملية:</strong>
                              <p>{getActionLabel(log.action_type)}</p>
                            </div>
                            <div>
                              <strong>المستخدم:</strong>
                              <p>{log.admin.full_name}</p>
                            </div>
                            <div>
                              <strong>التاريخ:</strong>
                              <p>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                            </div>
                            <div>
                              <strong>عنوان IP:</strong>
                              <p>{log.ip_address || 'غير محدد'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <strong>الوصف:</strong>
                            <p>{log.description}</p>
                          </div>

                          {log.old_values && (
                            <div>
                              <strong>القيم القديمة:</strong>
                              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.new_values && (
                            <div>
                              <strong>القيم الجديدة:</strong>
                              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.user_agent && (
                            <div>
                              <strong>المتصفح:</strong>
                              <p className="text-sm text-gray-600">{log.user_agent}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogTab;
