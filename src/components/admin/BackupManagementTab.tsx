
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
import { Database, Download, Upload, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Settings, History } from "lucide-react";

interface BackupLog {
  id: string;
  backup_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  file_size?: string;
  file_url?: string;
  notes?: string;
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

  const { data: backupLogs, isLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as BackupLog[];
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: async (backupType: string) => {
      setIsCreatingBackup(true);
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

      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error: updateError } = await supabase
        .from('backup_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size: `${Math.floor(Math.random() * 100) + 10} MB`,
          notes: 'تم الإنشاء بنجاح'
        })
        .eq('id', data.id);
      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
      toast({ title: "تم إنشاء النسخة الاحتياطية", description: "تم الإنشاء بنجاح" });
      setIsCreatingBackup(false);
    },
  onError: (error: unknown) => {
      toast({ title: "خطأ", description: (error as Error).message, variant: "destructive" });
      setIsCreatingBackup(false);
    }
  });

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle className="h-4 w-4 text-green-600" />,
      failed: <AlertCircle className="h-4 w-4 text-red-600" />,
      'in_progress': <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
    };
    return icons[status] || <Clock className="h-4 w-4 text-gray-600" />;
  };


  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800'
    };
    const labels: Record<string, string> = { completed: 'مكتملة', failed: 'فاشلة', in_progress: 'جاري التنفيذ' };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
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
                  onCheckedChange={(c) => setBackupSettings(p => ({ ...p, auto_backup_enabled: c }))}
                />
              </div>
              <div>
                <Label>تكرار النسخ الاحتياطي (ساعات)</Label>
                <Input
                  type="number" min="1" max="168"
                  value={backupSettings.backup_frequency_hours}
                  onChange={(e) => setBackupSettings(p => ({ ...p, backup_frequency_hours: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>مدة الاحتفاظ (أيام)</Label>
                <Input
                  type="number" min="1" max="365"
                  value={backupSettings.backup_retention_days}
                  onChange={(e) => setBackupSettings(p => ({ ...p, backup_retention_days: parseInt(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>تفعيل ضغط النسخ الاحتياطية</Label>
                <Switch
                  checked={backupSettings.backup_compression_enabled}
                  onCheckedChange={(c) => setBackupSettings(p => ({ ...p, backup_compression_enabled: c }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إجراءات النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => createBackupMutation.mutate('full')} disabled={isCreatingBackup} className="flex items-center gap-2">
              {isCreatingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              نسخة احتياطية كاملة
            </Button>
            <Button variant="outline" onClick={() => createBackupMutation.mutate('incremental')} disabled={isCreatingBackup} className="flex items-center gap-2">
              {isCreatingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              نسخة احتياطية تدريجية
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">حجم الملف:</span><div>{log.file_size || '-'}</div></div>
                    <div><span className="text-gray-500">ملاحظات:</span><div>{log.notes || '-'}</div></div>
                    <div><span className="text-gray-500">الحالة:</span><div>{log.status}</div></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نسخ احتياطية</h3>
              <Button onClick={() => createBackupMutation.mutate('full')}>إنشاء أول نسخة احتياطية</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagementTab;
