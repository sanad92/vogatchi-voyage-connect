import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { safarLandingQueryKey } from '@/hooks/useSafarLandingSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SettingField {
  key: string;
  label: string;
  multiline?: boolean;
  type?: 'email' | 'tel';
  pattern?: string;
  maxLength?: number;
  hint?: string;
}

const generalFields: SettingField[] = [
  { key: 'site_name', label: 'اسم الموقع', maxLength: 100 },
  { key: 'site_description', label: 'وصف الموقع', multiline: true },
  { key: 'company_name', label: 'اسم الشركة المشغّلة', maxLength: 100 },
  { key: 'company_phone', label: 'هاتف الشركة المشغّلة', type: 'tel' },
  { key: 'company_email', label: 'بريد الشركة المشغّلة', type: 'email' },
  { key: 'company_address', label: 'عنوان الشركة المشغّلة', multiline: true },
];
const landingFields: SettingField[] = [
  { key: 'safar_landing_headline', label: 'العنوان أسفل اسم SafarERP', maxLength: 100 },
  { key: 'safar_landing_intro', label: 'النص التعريفي في أول الصفحة', multiline: true },
  { key: 'safar_landing_footer', label: 'الوصف أسفل الصفحة', multiline: true },
  { key: 'safar_landing_phone', label: 'رقم التواصل أسفل الصفحة', type: 'tel', pattern: '\\+[1-9][0-9]{7,14}', maxLength: 16, hint: 'اكتب الرقم بالصيغة الدولية، مثل +201103442886.' },
];

export default function SystemSettingsTab({ scope = 'general' }: { scope?: 'general' | 'landing' }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isLanding = scope === 'landing';
  const fields = isLanding ? landingFields : generalFields;
  const settings = useQuery({
    queryKey: ['platform-settings', scope],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('system_settings')
        .select('setting_key,setting_value').in('setting_key', fields.map(field => field.key)).abortSignal(signal);
      if (error) throw error;
      return new Map(data.map(row => [row.setting_key, row.setting_value ?? '']));
    },
  });

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase.rpc('update_system_setting', { setting_key_param: key, setting_value_param: value });
      if (error) throw error;
      if (!data) throw new Error('Setting was not saved');
    },
    onSuccess: (_, { key, value }) => {
      queryClient.setQueryData<Map<string, string>>(['platform-settings', scope], previous =>
        new Map(previous).set(key, value),
      );
      clearDraft(key);
      void queryClient.invalidateQueries({ queryKey: ['platform-settings', scope] });
      if (isLanding) void queryClient.invalidateQueries({ queryKey: safarLandingQueryKey });
      toast.success('تم حفظ الإعداد');
    },
    onError: (error: { code?: string }) => {
      toast.error(error.code === '22023' ? 'راجع القيمة المدخلة وحاول مرة أخرى.' : 'تعذّر حفظ الإعداد. حاول مرة أخرى.');
    },
  });

  function clearDraft(key: string) {
    setDrafts(previous => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();
    const value = drafts[key]?.trim();
    if (value && value !== settings.data?.get(key)) save.mutate({ key, value });
  }

  if (settings.isPending) return <p role="status">جارٍ تحميل الإعدادات...</p>;
  if (settings.isError) return (
    <div className="flex flex-wrap items-center gap-3" role="alert">
      <p>تعذّر تحميل الإعدادات.</p>
      <Button variant="outline" onClick={() => void settings.refetch()}>إعادة المحاولة</Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLanding ? 'محتوى الصفحة الرئيسية' : 'الإعدادات العامة'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLanding
            ? 'بيظهر التعديل على الصفحة الرئيسية بعد الحفظ.'
            : 'دي البيانات العامة المحفوظة للمنصة. لتغيير النصوص ورقم التواصل المنشورين، استخدم تاب صفحة الهبوط.'}
        </p>
        {isLanding && <a className="w-fit text-sm text-primary underline" href="https://safarerp.com/" target="_blank" rel="noreferrer">عرض الصفحة الرئيسية</a>}
      </CardHeader>
      <CardContent className="divide-y">
        {fields.map(field => {
          const saved = settings.data.get(field.key);
          const draft = drafts[field.key] ?? saved ?? '';
          const changed = draft !== saved;
          const inputProps = {
            id: field.key,
            value: draft,
            required: true,
            maxLength: field.maxLength ?? 500,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const value = event.target.value;
              setDrafts(previous => ({ ...previous, [field.key]: value }));
            },
            disabled: saved === undefined || save.isPending,
            'aria-describedby': field.hint ? `${field.key}-hint` : undefined,
          };
          return (
            <form className="grid gap-2 py-4 first:pt-0 last:pb-0" key={field.key} onSubmit={event => submit(event, field.key)}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.hint && <p className="text-xs text-muted-foreground" id={`${field.key}-hint`}>{field.hint}</p>}
              {saved === undefined ? <p className="text-sm text-muted-foreground">الإعداد غير متاح حاليًا.</p> : field.multiline
                ? <Textarea {...inputProps} rows={3} />
                : <Input {...inputProps} type={field.type ?? 'text'} pattern={field.pattern} dir={field.type ? 'ltr' : undefined} />}
              {saved !== undefined && changed && <div className="flex gap-2">
                <Button size="sm" disabled={save.isPending || !draft.trim() || draft.trim() === saved}>حفظ</Button>
                <Button size="sm" type="button" variant="outline" disabled={save.isPending} onClick={() => clearDraft(field.key)}>إلغاء</Button>
              </div>}
            </form>
          );
        })}
      </CardContent>
    </Card>
  );
}
