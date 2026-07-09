import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Plus, Trash2, Play, Pause, Activity, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import {
  useWhatsAppAutomation, AutomationTriggerType, AutomationCondition, AutomationAction, AutomationRule,
} from '@/hooks/useWhatsAppAutomation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const triggerLabels: Record<AutomationTriggerType, string> = {
  message_received: 'استقبال رسالة',
  message_sent: 'إرسال رسالة',
  conversation_opened: 'فتح محادثة',
  conversation_closed: 'إغلاق محادثة',
  keyword_match: 'كلمة مفتاحية',
  no_reply_timeout: 'عدم الرد لمدة',
  first_message: 'أول رسالة من عميل',
  tag_added: 'إضافة وسم',
  sla_breach: 'خرق SLA',
};

const operatorLabels: Record<string, string> = {
  equals: 'يساوي', not_equals: 'لا يساوي', contains: 'يحتوي',
  starts_with: 'يبدأ بـ', ends_with: 'ينتهي بـ', regex: 'Regex',
  in: 'ضمن قائمة', greater_than: 'أكبر من', less_than: 'أصغر من',
};

const actionLabels: Record<string, string> = {
  send_message: 'إرسال رسالة',
  send_template: 'إرسال قالب',
  assign_to: 'تعيين لموظف',
  add_tag: 'إضافة وسم',
  set_priority: 'تحديد أولوية',
  set_status: 'تغيير الحالة',
  create_followup: 'إنشاء متابعة',
  notify_agent: 'إشعار الموظف',
  webhook: 'استدعاء Webhook',
};

const emptyRule: Partial<AutomationRule> = {
  name: '', description: '', trigger_type: 'message_received', trigger_config: {},
  conditions: [], actions: [], is_active: true, priority: 100,
};

export const WhatsAppAutomationBuilder: React.FC = () => {
  const { rules, executions, isLoading, createRule, updateRule, deleteRule, toggleRule } = useWhatsAppAutomation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AutomationRule>>(emptyRule);

  const openNew = () => { setEditing(emptyRule); setOpen(true); };
  const openEdit = (r: AutomationRule) => { setEditing(r); setOpen(true); };

  const save = async () => {
    if (!editing.name || !editing.trigger_type) return;
    if (editing.id) {
      await updateRule(editing as any);
    } else {
      await createRule(editing);
    }
    setOpen(false);
  };

  const addCondition = () => setEditing((p) => ({
    ...p, conditions: [...(p.conditions || []), { field: 'message.content', operator: 'contains', value: '' }],
  }));
  const updateCondition = (i: number, patch: Partial<AutomationCondition>) => setEditing((p) => ({
    ...p, conditions: (p.conditions || []).map((c, idx) => idx === i ? { ...c, ...patch } : c),
  }));
  const removeCondition = (i: number) => setEditing((p) => ({
    ...p, conditions: (p.conditions || []).filter((_, idx) => idx !== i),
  }));

  const addAction = () => setEditing((p) => ({
    ...p, actions: [...(p.actions || []), { type: 'send_message', config: { message: '' } }],
  }));
  const updateAction = (i: number, patch: Partial<AutomationAction>) => setEditing((p) => ({
    ...p, actions: (p.actions || []).map((a, idx) => idx === i ? { ...a, ...patch } : a),
  }));
  const removeAction = (i: number) => setEditing((p) => ({
    ...p, actions: (p.actions || []).filter((_, idx) => idx !== i),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> محرك الأتمتة المتقدم
          </h2>
          <p className="text-muted-foreground mt-1">قواعد ذكية تُشغَّل تلقائيًا على أحداث WhatsApp</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> قاعدة جديدة</Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">القواعد ({rules.length})</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="w-4 h-4 ml-1" /> السجل ({executions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : rules.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              لا توجد قواعد. أنشئ قاعدة لأتمتة الردود والتعيينات.
            </CardContent></Card>
          ) : rules.map((r) => (
            <Card key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{r.name}</h3>
                    <Badge variant="outline">{triggerLabels[r.trigger_type]}</Badge>
                    <Badge variant="secondary">أولوية {r.priority}</Badge>
                    <Badge variant="secondary">{r.execution_count} تنفيذ</Badge>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.conditions.length} شروط · {r.actions.length} إجراءات
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={r.is_active}
                    onCheckedChange={(v) => toggleRule({ id: r.id, is_active: v })} />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>تعديل</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRule(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {executions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">لا يوجد تنفيذات بعد</div>
                )}
                {executions.map((e: any) => (
                  <div key={e.id} className="p-3 flex items-center gap-3">
                    {e.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {e.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {e.status === 'skipped' && <Pause className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{e.rule?.name || e.rule_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {triggerLabels[e.trigger_type as AutomationTriggerType]} · {e.execution_time_ms}ms
                        {e.error_message && <span className="text-red-500"> · {e.error_message}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), 'HH:mm dd/MM', { locale: ar })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'تعديل قاعدة' : 'قاعدة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>الأولوية</Label>
                <Input type="number" value={editing.priority ?? 100}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>المُشغّل *</Label>
              <Select value={editing.trigger_type}
                onValueChange={(v: any) => setEditing({ ...editing, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">الشروط (كلها يجب أن تتحقق)</Label>
                <Button size="sm" variant="outline" onClick={addCondition}>
                  <Plus className="w-3 h-3 ml-1" /> شرط
                </Button>
              </div>
              {(editing.conditions || []).map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input placeholder="مثل message.content" value={c.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value })} />
                  <Select value={c.operator} onValueChange={(v: any) => updateCondition(i, { operator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(operatorLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="القيمة" value={String(c.value ?? '')}
                    onChange={(e) => updateCondition(i, { value: e.target.value })} />
                  <Button size="sm" variant="ghost" onClick={() => removeCondition(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">الإجراءات (تُنفَّذ بالترتيب)</Label>
                <Button size="sm" variant="outline" onClick={addAction}>
                  <Plus className="w-3 h-3 ml-1" /> إجراء
                </Button>
              </div>
              {(editing.actions || []).map((a, i) => (
                <div key={i} className="border rounded p-2 mb-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={a.type} onValueChange={(v: any) => updateAction(i, { type: v, config: {} })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(actionLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => removeAction(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {(a.type === 'send_message' || a.type === 'notify_agent') && (
                    <Textarea rows={2} placeholder="الرسالة (يدعم {{customer.name}}, {{message.content}})"
                      value={a.config.message || ''}
                      onChange={(e) => updateAction(i, { config: { ...a.config, message: e.target.value } })} />
                  )}
                  {a.type === 'set_priority' && (
                    <Select value={a.config.priority || 'normal'}
                      onValueChange={(v) => updateAction(i, { config: { priority: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">منخفضة</SelectItem>
                        <SelectItem value="normal">عادية</SelectItem>
                        <SelectItem value="high">عالية</SelectItem>
                        <SelectItem value="urgent">عاجلة</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {a.type === 'set_status' && (
                    <Select value={a.config.status || 'active'}
                      onValueChange={(v) => updateAction(i, { config: { status: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشطة</SelectItem>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="closed">مغلقة</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {a.type === 'add_tag' && (
                    <Input placeholder="اسم الوسم" value={a.config.tag_name || ''}
                      onChange={(e) => updateAction(i, { config: { tag_name: e.target.value } })} />
                  )}
                  {a.type === 'create_followup' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="عنوان المتابعة" value={a.config.title || ''}
                        onChange={(e) => updateAction(i, { config: { ...a.config, title: e.target.value } })} />
                      <Input type="number" placeholder="بعد كم دقيقة" value={a.config.minutes_from_now || 60}
                        onChange={(e) => updateAction(i, { config: { ...a.config, minutes_from_now: Number(e.target.value) } })} />
                    </div>
                  )}
                  {a.type === 'webhook' && (
                    <Input placeholder="URL" value={a.config.url || ''}
                      onChange={(e) => updateAction(i, { config: { ...a.config, url: e.target.value } })} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!editing.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
