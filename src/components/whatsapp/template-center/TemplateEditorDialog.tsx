import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TEMPLATE_CATEGORIES, type TemplateCategoryKey } from '@/data/travelTemplateCategories';
import { VariableInserter } from './VariableInserter';
import { TemplatePreview } from './TemplatePreview';
import { useWhatsAppTemplateCenter } from '@/hooks/useWhatsAppTemplateCenter';
import { AiTemplateGeneratorDialog } from './AiTemplateGeneratorDialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any | null;
}

export const TemplateEditorDialog: React.FC<Props> = ({ open, onOpenChange, initial }) => {
  const { saveTemplate } = useWhatsAppTemplateCenter();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [form, setForm] = useState({
    id: undefined as string | undefined,
    name: '',
    displayName: '',
    description: '',
    category_key: 'marketing' as TemplateCategoryKey,
    locale: 'ar' as 'ar' | 'en',
    header_text: '',
    body_text: '',
    footer_text: '',
    tags: '' as string,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        id: initial.id,
        name: initial.name || '',
        displayName: initial.displayName || initial.name || '',
        description: initial.description || '',
        category_key: (initial.category_key || 'marketing') as TemplateCategoryKey,
        locale: (initial.locale || 'ar') as 'ar' | 'en',
        header_text: initial.header_text || '',
        body_text: initial.body_text || '',
        footer_text: initial.footer_text || '',
        tags: (initial.tags || []).join(', '),
      });
    } else {
      setForm((f) => ({ ...f, id: undefined, name: '', body_text: '', header_text: '', footer_text: '', description: '' }));
    }
  }, [initial, open]);

  const insertAtCursor = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body_text: f.body_text + token }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setForm((f) => ({ ...f, body_text: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.body_text.trim()) return;
    await saveTemplate.mutateAsync({
      id: form.id,
      name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
      language: form.locale,
      locale: form.locale,
      category_key: form.category_key,
      category: form.category_key,
      description: form.description || null,
      header_text: form.header_text || null,
      body_text: form.body_text,
      footer_text: form.footer_text || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.id ? undefined : 'draft',
    });
    onOpenChange(false);
  };

  const applyAI = (t: any) => {
    setForm((f) => ({
      ...f,
      name: t.name || f.name,
      displayName: t.displayName || f.displayName,
      description: t.description || f.description,
      body_text: t.body || f.body_text,
      header_text: t.header || f.header_text,
      footer_text: t.footer || f.footer_text,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{form.id ? 'تحرير القالب' : 'قالب جديد'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <Label>الفئة</Label>
                <Select
                  value={form.category_key}
                  onValueChange={(v: any) => setForm({ ...form, category_key: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.labelAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label>اللغة</Label>
                <Select value={form.locale} onValueChange={(v: any) => setForm({ ...form, locale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>الاسم (لاستخدام Meta)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="booking_confirmed_ar"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>الوصف</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="متى نستخدم هذا القالب"
              />
            </div>

            <div>
              <Label>الرأس (اختياري)</Label>
              <Input
                value={form.header_text}
                onChange={(e) => setForm({ ...form, header_text: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>نص الرسالة</Label>
                <div className="flex items-center gap-2">
                  <AiTemplateGeneratorDialog
                    category={form.category_key}
                    locale={form.locale}
                    onGenerated={applyAI}
                  />
                  <VariableInserter onInsert={insertAtCursor} />
                </div>
              </div>
              <Textarea
                ref={bodyRef}
                value={form.body_text}
                onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                rows={8}
                placeholder="مرحباً {{customer_first_name}} ..."
                dir={form.locale === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <Label>التذييل (اختياري)</Label>
              <Input
                value={form.footer_text}
                onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
              />
            </div>

            <div>
              <Label>الوسوم (مفصولة بفواصل)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="promo, summer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>معاينة WhatsApp</Label>
              <Badge variant="outline">{form.locale === 'ar' ? 'عربي' : 'English'}</Badge>
            </div>
            <TemplatePreview
              header={form.header_text}
              body={form.body_text || 'ابدأ الكتابة لرؤية المعاينة...'}
              footer={form.footer_text}
              locale={form.locale}
              variables={(initial?.preview_variables || {}) as any}
            />
            <div className="text-[11px] text-muted-foreground">
              المتغيرات المستخدمة: {(form.body_text.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) || []).join('، ') || 'لا يوجد'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saveTemplate.isPending}>
            {saveTemplate.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
