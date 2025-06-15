
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Key,
  Globe,
  Clock,
  UserX,
  Activity
} from "lucide-react";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  description: string;
  created_at: string;
}

interface ActiveSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  last_activity: string;
  is_current: boolean;
}

const SecurityManagementTab = () => {
  const queryClient = useQueryClient();
  const [securitySettings, setSecuritySettings] = useState({
    enable_brute_force_protection: true,
    max_failed_attempts: 5,
    lockout_duration_minutes: 30,
    require_strong_passwords: true,
    enable_session_timeout: true,
    session_timeout_minutes: 480,
    enable_ip_whitelist: false,
    allowed_ip_ranges: '',
    enable_audit_logging: true,
    log_retention_days: 90
  });

  // جلب الأحداث الأمنية الأخيرة
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SecurityEvent[];
    }
  });

  // جلب الجلسات النشطة
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_active_sessions')
        .select('*')
        .order('last_activity', { ascending: false });
      
      if (error) throw error;
      return data as ActiveSession[];
    }
  });

  // تحديث إعدادات الأمان
  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: typeof securitySettings) => {
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
        description: "تم تحديث إعدادات الأمان بنجاح",
      });
    }
  });

  // إنهاء جلسة مستخدم
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('admin_active_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast({
        title: "تم إنهاء الجلسة",
        description: "تم إنهاء الجلسة بنجاح",
      });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <Eye className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={variants[severity as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {severity === 'high' ? 'عالي' : 
         severity === 'medium' ? 'متوسط' : 
         severity === 'low' ? 'منخفض' : severity}
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
            إعدادات الأمان المتقدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>حماية من هجمات القوة الغاشمة</Label>
                <Switch
                  checked={securitySettings.enable_brute_force_protection}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, enable_brute_force_protection: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="max_attempts">الحد الأقصى لمحاولات تسجيل الدخول الفاشلة</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min="3"
                  max="10"
                  value={securitySettings.max_failed_attempts}
                  onChange={(e) => 
                    setSecuritySettings(prev => ({ ...prev, max_failed_attempts: parseInt(e.target.value) }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="lockout_duration">مدة الحظر (بالدقائق)</Label>
                <Input
                  id="lockout_duration"
                  type="number"
                  min="5"
                  max="120"
                  value={securitySettings.lockout_duration_minutes}
                  onChange={(e) => 
                    setSecuritySettings(prev => ({ ...prev, lockout_duration_minutes: parseInt(e.target.value) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>طلب كلمات مرور قوية</Label>
                <Switch
                  checked={securitySettings.require_strong_passwords}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, require_strong_passwords: checked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل انتهاء الجلسة التلقائي</Label>
                <Switch
                  checked={securitySettings.enable_session_timeout}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, enable_session_timeout: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="session_timeout">مهلة انتهاء الجلسة (بالدقائق)</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  min="15"
                  max="1440"
                  value={securitySettings.session_timeout_minutes}
                  onChange={(e) => 
                    setSecuritySettings(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>تفعيل القائمة البيضاء للـ IP</Label>
                <Switch
                  checked={securitySettings.enable_ip_whitelist}
                  onCheckedChange={(checked) => 
                    setSecuritySettings(prev => ({ ...prev, enable_ip_whitelist: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="ip_ranges">نطاقات IP المسموحة</Label>
                <Input
                  id="ip_ranges"
                  placeholder="192.168.1.0/24, 10.0.0.0/8"
                  value={securitySettings.allowed_ip_ranges}
                  onChange={(e) => 
                    setSecuritySettings(prev => ({ ...prev, allowed_ip_ranges: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateSecurityMutation.mutate(securitySettings)}
              disabled={updateSecurityMutation.isPending}
            >
              حفظ إعدادات الأمان
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* الجلسات النشطة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            الجلسات النشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-8">جاري تحميل الجلسات النشطة...</div>
          ) : activeSessions && activeSessions.length > 0 ? (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{session.ip_address}</span>
                      {session.is_current && (
                        <Badge className="bg-green-100 text-green-800">الجلسة الحالية</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        آخر نشاط: {new Date(session.last_activity).toLocaleString('ar-SA')}
                      </span>
                      {!session.is_current && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => terminateSessionMutation.mutate(session.id)}
                          disabled={terminateSessionMutation.isPending}
                        >
                          <UserX className="h-4 w-4" />
                          إنهاء الجلسة
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {session.user_agent}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد جلسات نشطة</h3>
              <p className="text-gray-600">لم يتم العثور على جلسات نشطة حالياً</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سجل الأحداث الأمنية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            سجل الأحداث الأمنية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">جاري تحميل الأحداث الأمنية...</div>
          ) : securityEvents && securityEvents.length > 0 ? (
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      <span className="font-medium">{event.event_type}</span>
                      {getSeverityBadge(event.severity)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.created_at).toLocaleString('ar-SA')}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{event.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    {event.ip_address && (
                      <div>
                        <span className="font-medium">IP:</span> {event.ip_address}
                      </div>
                    )}
                    {event.user_id && (
                      <div>
                        <span className="font-medium">المستخدم:</span> {event.user_id}
                      </div>
                    )}
                    {event.user_agent && (
                      <div className="col-span-2 md:col-span-1">
                        <span className="font-medium">المتصفح:</span>
                        <div className="truncate">{event.user_agent}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
