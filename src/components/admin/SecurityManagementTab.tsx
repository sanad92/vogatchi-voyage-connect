
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Shield, Lock, AlertTriangle, CheckCircle, Activity } from "lucide-react";

const SecurityManagementTab = () => {
  const [securitySettings, setSecuritySettings] = useState({
    enable_brute_force_protection: true,
    max_failed_attempts: 5,
    lockout_duration_minutes: 30,
    require_strong_passwords: true,
    enable_session_timeout: true,
    session_timeout_minutes: 480,
    enable_audit_logging: true,
    log_retention_days: 90
  });

  // جلب سجل العمليات من admin_audit_log
  const { data: securityEvents, isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        action: item.action || '',
        severity: item.action?.includes('delet') ? 'high' : item.action?.includes('updat') ? 'medium' : 'low',
        user_id: item.user_id,
        ip_address: item.ip_address,
        details: item.details,
        created_at: item.created_at
      }));
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <Shield className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    const labels: Record<string, string> = { high: 'عالي', medium: 'متوسط', low: 'منخفض' };
    return (
      <Badge className={variants[severity] || 'bg-gray-100 text-gray-800'}>
        {labels[severity] || severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* إعدادات الأمان */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إعدادات الأمان
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>حماية من هجمات القوة الغاشمة</Label>
                <Switch
                  checked={securitySettings.enable_brute_force_protection}
                  onCheckedChange={(c) => setSecuritySettings(p => ({ ...p, enable_brute_force_protection: c }))}
                />
              </div>
              <div>
                <Label>الحد الأقصى لمحاولات الدخول الفاشلة</Label>
                <Input
                  type="number" min="3" max="10"
                  value={securitySettings.max_failed_attempts}
                  onChange={(e) => setSecuritySettings(p => ({ ...p, max_failed_attempts: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label>مدة الحظر (دقائق)</Label>
                <Input
                  type="number" min="5" max="120"
                  value={securitySettings.lockout_duration_minutes}
                  onChange={(e) => setSecuritySettings(p => ({ ...p, lockout_duration_minutes: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل انتهاء الجلسة التلقائي</Label>
                <Switch
                  checked={securitySettings.enable_session_timeout}
                  onCheckedChange={(c) => setSecuritySettings(p => ({ ...p, enable_session_timeout: c }))}
                />
              </div>
              <div>
                <Label>مهلة الجلسة (دقائق)</Label>
                <Input
                  type="number" min="15" max="1440"
                  value={securitySettings.session_timeout_minutes}
                  onChange={(e) => setSecuritySettings(p => ({ ...p, session_timeout_minutes: parseInt(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>طلب كلمات مرور قوية</Label>
                <Switch
                  checked={securitySettings.require_strong_passwords}
                  onCheckedChange={(c) => setSecuritySettings(p => ({ ...p, require_strong_passwords: c }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الأمان محلياً" })}>
              حفظ إعدادات الأمان
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* سجل الأحداث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            سجل الأحداث الأمنية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : securityEvents && securityEvents.length > 0 ? (
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      <span className="font-medium text-sm">{event.action}</span>
                      {getSeverityBadge(event.severity)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  {event.ip_address && (
                    <div className="text-xs text-gray-500">IP: {event.ip_address}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أحداث أمنية</h3>
              <p className="text-gray-600">لم يتم تسجيل أي أحداث أمنية بعد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityManagementTab;
