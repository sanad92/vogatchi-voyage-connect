import { useState } from 'react';
import { useAutomationRules, useAutomationLogs, TRIGGER_LABELS, ACTION_LABELS, TRIGGER_ICONS, ACTION_ICONS, type TriggerType, type ActionType } from '@/hooks/useAutomationRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, History, Settings2, Play, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const AutomationRules = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRule } = useAutomationRules();
  const { data: logs = [], isLoading: logsLoading } = useAutomationLogs();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'booking_created' as TriggerType,
    trigger_config: {} as Record<string, any>,
    actions: [{ action_type: 'send_email' as ActionType, action_config: {}, sort_order: 0, is_active: true }],
  });

  const handleCreate = () => {
    createRule.mutate({
      name: formData.name,
      description: formData.description,
      trigger_type: formData.trigger_type,
      trigger_config: formData.trigger_config,
      actions: formData.actions,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setFormData({
          name: '', description: '', trigger_type: 'booking_created',
          trigger_config: {},
          actions: [{ action_type: 'send_email', action_config: {}, sort_order: 0, is_active: true }],
        });
      },
    });
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { action_type: 'send_email' as ActionType, action_config: {}, sort_order: prev.actions.length, is_active: true }],
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const updateActionType = (index: number, type: ActionType) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, action_type: type } : a),
    }));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, action_config: { ...a.action_config, [key]: value } } : a),
    }));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'failed': return 'فشل';
      case 'processing': return 'قيد التنفيذ';
      default: return 'في الانتظار';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">نظام الأتمتة</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة القواعد التلقائية للحجوزات والإشعارات</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          قاعدة جديدة
        </Button>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            القواعد
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            سجل التنفيذ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد قواعد أتمتة</h3>
                <p className="text-muted-foreground mb-4">أنشئ قاعدة جديدة لأتمتة عملياتك</p>
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إنشاء قاعدة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map(rule => (
                <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'نشط' : 'معطل'}
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
                          {(rule.automation_actions || []).map((action: any, i: number) => (
                            <Badge key={i} variant="outline" className="gap-1">
                              {ACTION_ICONS[action.action_type as ActionType]} {ACTION_LABELS[action.action_type as ActionType] || action.action_type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.is_active}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {logsLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : (logs as any[]).length === 0 ? (
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
                      {(logs as any[]).map((log: any) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {statusIcon(log.status)}
                              <span>{statusLabel(log.status)}</span>
                            </div>
                          </td>
                          <td className="p-3">{TRIGGER_LABELS[log.trigger_type as TriggerType] || log.trigger_type}</td>
                          <td className="p-3">{ACTION_LABELS[log.action_type as ActionType] || log.action_type}</td>
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

            <div>
              <Label>المحفز (Trigger)</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(v) => setFormData(p => ({ ...p, trigger_type: v as TriggerType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {TRIGGER_ICONS[key as TriggerType]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_type === 'before_travel' && (
              <div>
                <Label>عدد الأيام قبل السفر</Label>
                <Input
                  type="number"
                  value={formData.trigger_config.days_before || 3}
                  onChange={e => setFormData(p => ({ ...p, trigger_config: { ...p.trigger_config, days_before: parseInt(e.target.value) } }))}
                  min={1}
                  max={30}
                />
              </div>
            )}

            {formData.trigger_type === 'booking_status_changed' && (
              <div>
                <Label>الحالة المحددة (اختياري)</Label>
                <Input
                  value={formData.trigger_config.status_name || ''}
                  onChange={e => setFormData(p => ({ ...p, trigger_config: { ...p.trigger_config, status_name: e.target.value } }))}
                  placeholder="مثال: مؤكد"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>الإجراءات (Actions)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAction} className="gap-1">
                  <Plus className="h-3 w-3" />
                  إضافة إجراء
                </Button>
              </div>

              {formData.actions.map((action, index) => (
                <Card key={index}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={action.action_type}
                        onValueChange={(v) => updateActionType(index, v as ActionType)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {ACTION_ICONS[key as ActionType]} {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.actions.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAction(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {action.action_type === 'send_email' && (
                      <div>
                        <Label className="text-xs">عنوان البريد</Label>
                        <Input
                          value={action.action_config.subject || ''}
                          onChange={e => updateActionConfig(index, 'subject', e.target.value)}
                          placeholder="تأكيد الحجز"
                          className="text-sm"
                        />
                      </div>
                    )}

                    {action.action_type === 'send_whatsapp' && (
                      <div>
                        <Label className="text-xs">نص الرسالة</Label>
                        <Textarea
                          value={action.action_config.message_template || ''}
                          onChange={e => updateActionConfig(index, 'message_template', e.target.value)}
                          placeholder="مرحباً {{customer_name}}، تم تسجيل حجزك بنجاح."
                          rows={2}
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          متغيرات متاحة: {'{{customer_name}}'}, {'{{booking_type}}'}, {'{{travel_date}}'}, {'{{total_amount}}'}
                        </p>
                      </div>
                    )}

                    {action.action_type === 'send_reminder' && (
                      <div>
                        <Label className="text-xs">أيام قبل السفر</Label>
                        <Input
                          type="number"
                          value={action.action_config.days_before || 3}
                          onChange={e => updateActionConfig(index, 'days_before', e.target.value)}
                          min={1}
                          max={30}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || createRule.isPending}
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
