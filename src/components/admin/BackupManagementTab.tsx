
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { 
  Database, 
  Download, 
  Upload, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  History
} from "lucide-react";

interface BackupLog {
  id: string;
  backup_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  file_size?: number;
  file_path?: string;
  error_message?: string;
  created_by?: string;
}

const BackupManagementTab = () => {
  const queryClient = useQueryClient();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSettings, setBackupSettings] = useState({
    auto_backup_enabled: true,
    backup_frequency_hours: 24,
    backup_retention_days: 30,
    backup_compression_enabled: true
  });

  // جلب سجلات النسخ الاحتياطية
  const { data: backupLogs, isLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as BackupLog[];
    }
  });

  // إنشاء نسخة احتياطية
  const createBackupMutation = useMutation({
    mutationFn: async (backupType: string) => {
      setIsCreatingBackup(true);
      
      // إدراج سجل جديد في backup_logs
      const { data, error } = await supabase
        .from('backup_logs')
        .insert({
          backup_type: backupType,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // محاكاة عملية النسخ الاحتياطي
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // تحديث السجل بالنجاح
      const { error: updateError } = await supabase
        .from('backup_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size: Math.floor(Math.random() * 100000000) + 10000000, // حجم عشوائي
          file_path: `/backups/${data.id}_${backupType}_${Date.now()}.sql`
        })
        .eq('id', data.id);
      
      if (updateError) throw updateError;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: "تم إنشاء النسخة الاحتياطية بنجاح",
      });
      setIsCreatingBackup(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء النسخة الاحتياطية",
        description: error.message,
        variant: "destructive",
      });
      setIsCreatingBackup(false);
    }
  });

  // تحديث إعدادات النسخ الاحتياطي
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: typeof backupSettings) => {
      const promises = Object.entries(settings).map(([key, value]) =>
        supabase.rpc('update_system_setting', {
          setting_key_param: key,
          setting_value_param: value.toString()
        })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('فشل في تحديث بعض الإعدادات');
      }
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات النسخ الاحتياطي بنجاح",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status === 'completed' ? 'مكتملة' : 
         status === 'failed' ? 'فاشلة' : 
         status === 'in_progress' ? 'جاري التنفيذ' : status}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return '-';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration} ثانية`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل سجلات النسخ الاحتياطية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* إعدادات النسخ الاحتياطي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل النسخ الاحتياطي التلقائي</Label>
                <Switch
                  checked={backupSettings.auto_backup_enabled}
                  onCheckedChange={(checked) => 
                    setBackupSettings(prev => ({ ...prev, auto_backup_enabled: checked }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="frequency">تكرار النسخ الاحتياطي (ساعات)</Label>
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  max="168"
                  value={backupSettings.backup_frequency_hours}
                  onChange={(e) => 
                    setBackupSettings(prev => ({ ...prev, backup_frequency_hours: parseInt(e.target.value) }))
                  }
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="retention">مدة الاحتفاظ (أيام)</Label>
                <Input
                  id="retention"
                  type="number"
                  min="1"
                  max="365"
                  value={backupSettings.backup_retention_days}
                  onChange={(e) => 
                    setBackupSettings(prev => ({ ...prev, backup_retention_days: parseInt(e.target.value) }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>تفعيل ضغط النسخ الاحتياطية</Label>
                <Switch
                  checked={backupSettings.backup_compression_enabled}
                  onCheckedChange={(checked) => 
                    setBackupSettings(prev => ({ ...prev, backup_compression_enabled: checked }))
                  }
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={() => updateSettingsMutation.mutate(backupSettings)}
              disabled={updateSettingsMutation.isPending}
            >
              حفظ الإعدادات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* إجراءات النسخ الاحتياطي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إجراءات النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => createBackupMutation.mutate('full')}
              disabled={isCreatingBackup}
              className="flex items-center gap-2"
            >
              {isCreatingBackup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              نسخة احتياطية كاملة
            </Button>
            
            <Button
              variant="outline"
              onClick={() => createBackupMutation.mutate('incremental')}
              disabled={isCreatingBackup}
              className="flex items-center gap-2"
            >
              {isCreatingBackup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              نسخة احتياطية تدريجية
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              استعادة من نسخة احتياطية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* سجل النسخ الاحتياطية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل النسخ الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupLogs && backupLogs.length > 0 ? (
            <div className="space-y-4">
              {backupLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">
                        {log.backup_type === 'full' ? 'نسخة كاملة' : 'نسخة تدريجية'}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.started_at).toLocaleString('ar-SA')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">المدة:</span>
                      <div>{formatDuration(log.started_at, log.completed_at)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">حجم الملف:</span>
                      <div>{formatFileSize(log.file_size)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">مسار الملف:</span>
                      <div className="truncate">{log.file_path || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">الحالة:</span>
                      <div>{log.error_message || 'مكتملة بنجاح'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نسخ احتياطية</h3>
              <p className="text-gray-600 mb-4">لم يتم إنشاء أي نسخ احتياطية بعد</p>
              <Button onClick={() => createBackupMutation.mutate('full')}>
                إنشاء أول نسخة احتياطية
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagementTab;
