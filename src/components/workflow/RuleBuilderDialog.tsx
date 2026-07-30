import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { useUpsertWorkflowRule, WorkflowRule } from '@/hooks/useWorkflowRules';

const EVENT_TYPES = [
  'lead.created', 'quote.created', 'quote.accepted', 'quote.rejected',
  'booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.completed',
  'booking.stage_advanced',
  'invoice.created', 'invoice.paid', 'invoice.overdue',
  'customer_payment.received', 'supplier_payment.paid', 'supplier_po.created',
  'voucher.generated', 'customer.created', 'task.created', 'task.completed',
];

const CONDITION_FIELDS = [
  { value: 'amount', label: 'المبلغ' },
  { value: 'currency', label: 'العملة' },
  { value: 'customer_id', label: 'العميل' },
  { value: 'supplier_id', label: 'المورّد' },
  { value: 'destination', label: 'الوجهة' },
  { value: 'branch_id', label: 'الفرع' },
  { value: 'assigned_consultant', label: 'المستشار' },
  { value: 'workflow_stage', label: 'مرحلة سير العمل' },
  { value: 'tag', label: 'الوسم' },
  { value: 'booking_type', label: 'نوع الحجز' },
  { value: 'organization_id', label: 'المؤسسة' },
  { value: 'due_date', label: 'تاريخ الاستحقاق' },
];

const OPERATORS = [
  { value: 'eq', label: 'يساوي' },
  { value: 'neq', label: 'لا يساوي' },
  { value: 'gt', label: 'أكبر من' },
  { value: 'gte', label: 'أكبر أو يساوي' },
  { value: 'lt', label: 'أقل من' },
  { value: 'lte', label: 'أقل أو يساوي' },
  { value: 'in', label: 'ضمن (فاصلة)' },
  { value: 'contains', label: 'يحتوي' },
];

const ACTION_TYPES = [
  { value: 'advance_workflow', label: 'تقدم مرحلة سير العمل', params: ['to_stage'] },
  { value: 'create_task', label: 'إنشاء مهمة', params: ['title', 'due_in_days', 'assign_to'] },
  { value: 'add_timeline_event', label: 'إضافة حدث للتايم لاين', params: ['title', 'severity'] },
  { value: 'send_whatsapp', label: 'إرسال واتساب', params: ['template_name', 'to'] },
  { value: 'send_email', label: 'إرسال بريد إلكتروني', params: ['template_name', 'to', 'subject'] },
  { value: 'generate_invoice', label: 'إنشاء فاتورة', params: [] },
  { value: 'generate_supplier_po', label: 'إنشاء أمر دفع مورّد', params: ['supplier_id'] },
  { value: 'generate_voucher', label: 'إنشاء قسيمة', params: [] },
  { value: 'assign_consultant', label: 'تعيين مستشار', params: ['user_id'] },
  { value: 'add_tag', label: 'إضافة وسم', params: ['tag'] },
  { value: 'emit_event', label: 'إطلاق حدث', params: ['event_type', 'payload_json'] },
];

const WORKFLOW_STAGE_OPTIONS = [
  { value: 'lead', label: 'عميل محتمل' },
  { value: 'qualified', label: 'مؤهل' },
  { value: 'quoted', label: 'تم عرض السعر' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'operations', label: 'تشغيل' },
  { value: 'traveling', label: 'مسافر' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'post_travel', label: 'ما بعد السفر' },
  { value: 'cancelled', label: 'ملغي' },
];

interface Condition { field: string; op: string; value: string; }
interface Action { type: string; params: Record<string, string>; }

interface Props {
  open: boolean;
  onClose: () => void;
  rule?: WorkflowRule | null;
}

export const RuleBuilderDialog = ({ open, onClose, rule }: Props) => {
  const upsert = useUpsertWorkflowRule();
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [eventType, setEventType] = useState(rule?.event_type ?? EVENT_TYPES[0]);
  const [priority, setPriority] = useState(rule?.priority ?? 100);
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);

  const initialConditions: Condition[] = (() => {
    const c: any = rule?.condition ?? {};
    if (Array.isArray(c.all)) return c.all;
    return [];
  })();
  const initialActions: Action[] = (() => {
    const a: any = rule?.action ?? {};
    if (Array.isArray(a.steps)) {
      return a.steps.map((step: any) => {
        if (step.type === 'advance_stage') {
          return { type: 'advance_workflow', params: { to_stage: step.to ?? '' } };
        }
        const { type, ...params } = step;
        return { type, params };
      });
    }
    if (a.type) return [{ type: a.type, params: a.params ?? {} }];
    return [];
  })();

  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [testResult, setTestResult] = useState<string | null>(null);

  const addCondition = () => setConditions([...conditions, { field: 'amount', op: 'gt', value: '' }]);
  const addAction = () => setActions([...actions, { type: 'add_timeline_event', params: {} }]);

  const handleSave = async (dryRun = false) => {
    const invalidStageAction = actions.some(
      (action) => action.type === 'advance_workflow' && !action.params.to_stage?.trim(),
    );
    if (invalidStageAction) {
      setTestResult('اختر مرحلة صحيحة لكل إجراء من نوع "تقدم مرحلة سير العمل".');
      return;
    }

    // Persist the action shape understood by the database workflow engine.
    const normalizedActions = actions.map((action) => {
      if (action.type === 'advance_workflow') {
        return { type: 'advance_stage', to: action.params.to_stage.trim() };
      }
      return { type: action.type, ...action.params };
    });

    const payload: Partial<WorkflowRule> = {
      id: rule?.id,
      name, description, event_type: eventType, priority,
      is_active: dryRun ? false : isActive,
      condition: { all: conditions },
      action: { steps: normalizedActions },
    };
    if (dryRun) {
      setTestResult(JSON.stringify(payload, null, 2));
      return;
    }
    await upsert.mutateAsync(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{rule ? 'تعديل قاعدة' : 'قاعدة جديدة'}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>الحدث المُشغِّل</Label>
              <select className="w-full h-9 border rounded-md px-2 bg-background" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>الأولوية</Label><Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} /></div>
            <div className="flex items-end gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>

          <div><Label>الوصف</Label><Textarea rows={2} value={description ?? ''} onChange={(e) => setDescription(e.target.value)} /></div>

          {/* Conditions */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">الشروط (كلها يجب أن تتحقق)</div>
              <Button size="sm" variant="outline" onClick={addCondition}><Plus className="w-3.5 h-3.5 ml-1" /> شرط</Button>
            </div>
            {conditions.length === 0 && <div className="text-xs text-muted-foreground">لا شروط — القاعدة تعمل على كل الأحداث من هذا النوع</div>}
            {conditions.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <select className="h-9 border rounded-md px-2 bg-background" value={c.field} onChange={(e) => { const n = [...conditions]; n[i].field = e.target.value; setConditions(n); }}>
                  {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select className="h-9 border rounded-md px-2 bg-background" value={c.op} onChange={(e) => { const n = [...conditions]; n[i].op = e.target.value; setConditions(n); }}>
                  {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <Input value={c.value} onChange={(e) => { const n = [...conditions]; n[i].value = e.target.value; setConditions(n); }} placeholder="قيمة" />
                <Button size="icon" variant="ghost" onClick={() => setConditions(conditions.filter((_, x) => x !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">الإجراءات (تُنفَّذ بالترتيب)</div>
              <Button size="sm" variant="outline" onClick={addAction}><Plus className="w-3.5 h-3.5 ml-1" /> إجراء</Button>
            </div>
            {actions.length === 0 && <div className="text-xs text-muted-foreground">أضف إجراءً واحدًا على الأقل</div>}
            {actions.map((a, i) => {
              const meta = ACTION_TYPES.find((t) => t.value === a.type) ?? ACTION_TYPES[0];
              return (
                <div key={i} className="border rounded p-2 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{i + 1}</Badge>
                    <select className="h-9 border rounded-md px-2 bg-background flex-1" value={a.type} onChange={(e) => { const n = [...actions]; n[i] = { type: e.target.value, params: {} }; setActions(n); }}>
                      {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <Button size="icon" variant="ghost" onClick={() => setActions(actions.filter((_, x) => x !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                  {meta.params.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {meta.params.map((p) => (
                        <div key={p}>
                          <Label className="text-xs">{p}</Label>
                          {p === 'to_stage' ? (
                            <select
                              className="w-full h-9 border rounded-md px-2 bg-background"
                              value={a.params[p] || ''}
                              onChange={(e) => {
                                const n = [...actions];
                                n[i].params = { ...n[i].params, [p]: e.target.value };
                                setActions(n);
                              }}
                            >
                              <option value="">اختر المرحلة</option>
                              {WORKFLOW_STAGE_OPTIONS.map((stage) => (
                                <option key={stage.value} value={stage.value}>{stage.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Input value={a.params[p] || ''} onChange={(e) => { const n = [...actions]; n[i].params = { ...n[i].params, [p]: e.target.value }; setActions(n); }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {testResult && (
            <div className="border rounded-md p-3 bg-muted/40">
              <div className="text-xs font-medium mb-1">نتيجة التجربة (بدون حفظ)</div>
              <pre className="text-[10px] overflow-x-auto max-h-64">{testResult}</pre>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="outline" onClick={() => handleSave(true)}>تجربة (Dry Run)</Button>
          <Button onClick={() => handleSave(false)} disabled={upsert.isPending || !name || actions.length === 0}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RuleBuilderDialog;
