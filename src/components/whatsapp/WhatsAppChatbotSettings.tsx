import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Save, MessageCircle, Loader2, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useWhatsAppChatbot } from '@/hooks/useWhatsAppChatbot';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const WhatsAppChatbotSettings: React.FC = () => {
  const { settings, interactions, isLoading, save, isSaving } = useWhatsAppChatbot();
  const [form, setForm] = useState(settings);
  const [keywordsText, setKeywordsText] = useState('');

  useEffect(() => {
    setForm(settings);
    setKeywordsText((settings.handoff_keywords || []).join(', '));
  }, [settings]);

  const handleSave = async () => {
    await save({
      ...form,
      handoff_keywords: keywordsText.split(',').map((k) => k.trim()).filter(Boolean),
    });
  };

  if (isLoading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" /> الشات بوت الذكي
          </h2>
          <p className="text-muted-foreground mt-1">رد تلقائي مدعوم بالذكاء الاصطناعي مع تحويل ذكي للموظفين</p>
        </div>
        <Badge variant={form.is_enabled ? 'default' : 'secondary'}>
          {form.is_enabled ? 'مفعّل' : 'متوقف'}
        </Badge>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          <TabsTrigger value="logs">
            <MessageCircle className="w-4 h-4 ml-1" /> السجل ({interactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>الإعدادات الأساسية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">تفعيل البوت</Label>
                  <p className="text-xs text-muted-foreground">عند التفعيل يرد البوت على الرسائل الواردة تلقائيًا</p>
                </div>
                <Switch checked={form.is_enabled}
                  onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم البوت</Label>
                  <Input value={form.bot_name}
                    onChange={(e) => setForm({ ...form, bot_name: e.target.value })} />
                </div>
                <div>
                  <Label>النموذج</Label>
                  <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (سريع، مجاني)</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (متقدم)</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>البرومبت (System Prompt) *</Label>
                <Textarea rows={6} value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">حدّد شخصية البوت ونطاق مسؤوليته وأسلوب الرد</p>
              </div>

              <div>
                <Label>رسالة الترحيب</Label>
                <Textarea rows={2} value={form.welcome_message || ''}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>قواعد التحويل لموظف</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>كلمات مفتاحية للتحويل (مفصولة بفواصل)</Label>
                <Input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="موظف, بشري, agent" />
                <p className="text-xs text-muted-foreground mt-1">
                  عند ذكر العميل لأي من هذه الكلمات يُحوَّل مباشرة لموظف
                </p>
              </div>

              <div>
                <Label>أقصى عدد ردود قبل التحويل التلقائي</Label>
                <Input type="number" min={1} max={20} value={form.max_bot_replies}
                  onChange={(e) => setForm({ ...form, max_bot_replies: Number(e.target.value) })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>تحويل تلقائي عند فشل البوت</Label>
                  <p className="text-xs text-muted-foreground">إذا فشل البوت في توليد رد، تُحوَّل المحادثة لموظف</p>
                </div>
                <Switch checked={form.auto_handoff_on_error}
                  onCheckedChange={(v) => setForm({ ...form, auto_handoff_on_error: v })} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
              حفظ الإعدادات
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {interactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    لا يوجد تفاعلات بعد
                  </div>
                )}
                {interactions.map((it: any) => (
                  <div key={it.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {it.was_handed_off && (
                          <Badge variant="outline" className="gap-1">
                            <User className="w-3 h-3" /> تحويل: {it.handoff_reason}
                          </Badge>
                        )}
                        {it.error_message && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" /> خطأ
                          </Badge>
                        )}
                        {it.latency_ms && <span>{it.latency_ms}ms</span>}
                      </div>
                      <span>{format(new Date(it.created_at), 'HH:mm dd/MM', { locale: ar })}</span>
                    </div>
                    {it.user_message && (
                      <div className="text-sm bg-muted p-2 rounded">
                        <User className="w-3 h-3 inline ml-1" />
                        {it.user_message}
                      </div>
                    )}
                    {it.bot_reply && (
                      <div className="text-sm bg-primary/5 p-2 rounded border border-primary/20">
                        <Bot className="w-3 h-3 inline ml-1" />
                        {it.bot_reply}
                      </div>
                    )}
                    {it.error_message && (
                      <div className="text-xs text-red-600">{it.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
