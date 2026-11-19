import { useState } from 'react';
import { useAutomationRules, useAutomationLogs, useStarterAutomationRules, supportsCustomAutomation, TRIGGER_LABELS, ACTION_LABELS, TRIGGER_ICONS, ACTION_ICONS, type TriggerType, type ActionType } from '@/hooks/useAutomationRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, History, Settings2, Library, Play, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AutomationLibrary, LibraryRuleCard } from '@/components/automation/AutomationLibrary';
import { AUTOMATION_LIBRARY } from '@/lib/automationLibrary';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

const AutomationRules = () => {
  const { rules, isLoading, createRule, deleteRule, toggleRule } = useAutomationRules();
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('automation_edit');
  const { settings, setEnabled } = useStarterAutomationRules();
  const { data: logs = [], isLoading: logsLoading } = useAutomationLogs();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', subject: '' });

  const handleCreate = () => createRule.mutate(formData, {
    onSuccess: () => {
      setShowCreate(false);
      setFormData({ name: '', description: '', subject: '' });
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing': return <Clock className="h-4 w-4 text-amber-600" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'queued': return 'البريد في الانتظار';
      case 'completed': return 'مكتمل';
      case 'failed': return 'فشل';
      case 'processing': return 'قيد التنفيذ';
      default: return 'في الانتظار';
    }
  };

  const enabledRuleKeys = new Set(settings.data?.map(setting => setting.rule_key));
  const enabledLibraryRules = AUTOMATION_LIBRARY.filter(rule => enabledRuleKeys.has(rule.key));
  const activeRulesCount = rules.filter(r => r.is_active && supportsCustomAutomation(r)).length + enabledLibraryRules.length;
  const completedCount = (logs as any[]).filter((l: any) => l.status === 'completed').length;
  const failedCount = (logs as any[]).filter((l: any) => l.status === 'failed').length;
  const [logFilter, setLogFilter] = useState<string>('all');

  const filteredLogs = logFilter === 'all'
    ? logs as any[]
    : (logs as any[]).filter((l: any) => l.status === logFilter);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{AUTOMATION_LIBRARY.length}</div>
            <div className="text-sm text-muted-foreground">قواعد جاهزة للتشغيل</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{activeRulesCount}</div>
            <div className="text-sm text-muted-foreground">قواعد نشطة</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{completedCount}</div>
            <div className="text-sm text-muted-foreground">تنفيذ ناجح</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-destructive">{failedCount}</div>
            <div className="text-sm text-muted-foreground">فشل</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">نظام الأتمتة</h1>
          <p className="text-muted-foreground text-sm mt-1">اختار من المكتبة القواعد اللي تناسب شركتك وتابع تنفيذها.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            قاعدة جديدة
          </Button>
        )}
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="library" className="gap-2">
            <Library className="h-4 w-4" />
            مكتبة القواعد
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            قواعد الشركة
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            سجل التنفيذ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {settings.isPending ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : settings.isError ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">تعذّر تحميل مكتبة القواعد.</p>
              <Button variant="outline" size="sm" onClick={() => void settings.refetch()}>إعادة المحاولة</Button>
            </div>
          ) : (
            <AutomationLibrary
              enabled={enabledRuleKeys}
              canEdit={canEdit}
              canAccessQuotes={hasPermission('quotes_view')}
              busy={setEnabled.isPending}
              onToggle={(key, enabled) => setEnabled.mutate({ key, enabled })}
            />
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {enabledLibraryRules.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">القواعد المفعّلة من المكتبة</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {enabledLibraryRules.map(rule => (
                  <LibraryRuleCard key={rule.key} rule={rule} enabled canEdit={canEdit} busy={setEnabled.isPending}
                    onToggle={(key, enabled) => setEnabled.mutate({ key, enabled })} />
                ))}
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد قواعد مخصصة</h3>
                {canEdit && (
                  <Button onClick={() => setShowCreate(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إنشاء قاعدة
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map(rule => {
                const supported = supportsCustomAutomation(rule);
                return <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{rule.name}</h3>
                          <Badge variant={rule.is_active && supported ? 'default' : 'secondary'}>
                            {supported ? (rule.is_active ? 'نشط' : 'معطل') : 'تنفيذ غير متاح'}
                          </Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {TRIGGER_ICONS[rule.trigger_type as TriggerType]} {TRIGGER_LABELS[rule.trigger_type as TriggerType] || rule.trigger_type}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          {(rule.automation_actions || []).map((action, i) => (
                            <Badge key={i} variant="outline" className="gap-1">
                              {ACTION_ICONS[action.action_type as ActionType]} {ACTION_LABELS[action.action_type as ActionType] || action.action_type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {canEdit && <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.is_active}
                          disabled={toggleRule.isPending || (!supported && !rule.is_active)}
                          aria-label={rule.is_active ? 'إيقاف القاعدة' : 'تفعيل القاعدة'}
                          onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule.mutate(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>}
                    </div>
                  </CardContent>
                </Card>;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Log Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'all', label: 'الكل' },
              { value: 'completed', label: 'ناجح' },
              { value: 'failed', label: 'فشل' },
              { value: 'processing', label: 'قيد التنفيذ' },
            ].map(f => (
              <Button
                key={f.value}
                variant={logFilter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {logsLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">لا توجد سجلات تنفيذ بعد</h3>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-3 font-medium">الحالة</th>
                        <th className="text-right p-3 font-medium">المحفز</th>
                        <th className="text-right p-3 font-medium">الإجراء</th>
                        <th className="text-right p-3 font-medium">نوع الحجز</th>
                        <th className="text-right p-3 font-medium">التاريخ</th>
                        <th className="text-right p-3 font-medium">الخطأ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log: any) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {statusIcon(log.status)}
                              <span>{statusLabel(log.status)}</span>
                            </div>
                          </td>
                          <td className="p-3">{AUTOMATION_LIBRARY.find(rule => rule.key === log.trigger_type)?.name ?? (TRIGGER_LABELS[log.trigger_type as TriggerType] || log.trigger_type)}</td>
                          <td className="p-3">{log.action_type === 'create_operations_task' ? 'إنشاء مهمة عمليات' : (ACTION_LABELS[log.action_type as ActionType] || log.action_type)}</td>
                          <td className="p-3">{log.booking_type || '-'}</td>
                          <td className="p-3 whitespace-nowrap">
                            {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar }) : '-'}
                          </td>
                          <td className="p-3 text-destructive text-xs max-w-[200px] truncate">{log.error_message || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء قاعدة أتمتة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>اسم القاعدة</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="مثال: إشعار حجز جديد"
              />
            </div>

            <div>
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="وصف لما تفعله هذه القاعدة"
                rows={2}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              عند تسجيل عميل جديد له بريد إلكتروني، يُضاف بريد ترحيب إلى قائمة الانتظار.
            </p>
            <div>
              <Label htmlFor="automation-email-subject">عنوان البريد (اختياري)</Label>
              <Input
                id="automation-email-subject"
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                placeholder="مرحبًا بك"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || createRule.isPending}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {createRule.isPending ? 'جاري الإنشاء...' : 'إنشاء القاعدة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomationRules;
