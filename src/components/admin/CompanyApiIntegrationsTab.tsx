import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LoaderCircle, Plug, Unplug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Provider = 'travelport' | 'sabre' | 'eta' | 'zatca';
type Environment = 'preproduction' | 'production';
type Field = { name: string; label: string; secret?: boolean };
type Connector = { id: Provider; name: string; description: string; fields: Field[]; url: string };
type Connection = { provider: Provider; environment: Environment; checked_at: string; revision: string };

const password = { name: 'password', label: 'كلمة مرور API', secret: true };
const clientId = { name: 'clientId', label: 'Client ID' };
const clientSecret = { name: 'clientSecret', label: 'Client Secret', secret: true };
const connectors: Connector[] = [
  {
    id: 'travelport', name: 'Galileo / Travelport',
    description: 'قراءة PNR للحجوزات المرتبطة في ملف الحجز.',
    fields: [{ name: 'username', label: 'اسم مستخدم API' }, password, clientId, clientSecret, { name: 'accessGroup', label: 'Access Group' }],
    url: 'https://developer.travelport.com/docs/getting-started/authentication',
  },
  {
    id: 'sabre', name: 'Sabre',
    description: 'قراءة PNR للحجوزات المرتبطة في ملف الحجز.',
    fields: [{ name: 'userId', label: 'API User ID / EPR' }, { name: 'pcc', label: 'PCC' }, { name: 'domain', label: 'Domain' }, password],
    url: 'https://github.com/SabreOSS/postman-collections/tree/master/Booking-Management',
  },
  {
    id: 'eta', name: 'الفاتورة الإلكترونية المصرية',
    description: 'التحقق من حساب ERP وإمكانية قراءة أنواع المستندات.',
    fields: [clientId, clientSecret],
    url: 'https://sdk.invoicing.eta.gov.eg/api/01-login-as-taxpayer-system/',
  },
  {
    id: 'zatca', name: 'فاتورة السعودية / ZATCA',
    description: 'اختبار مطابقة فاتورة موقّعة في منصة المحاكاة.',
    fields: [{ name: 'csid', label: 'Compliance CSID / Binary Security Token', secret: true }, { name: 'secret', label: 'Secret', secret: true }],
    url: 'https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/Fatoora_Portal_User_Manual_English.pdf',
  },
];

const pendingConnectors = [
  {
    name: 'Amadeus Enterprise',
    description: 'يلزم دعم حزمة Enterprise المخصصة للوكالة ومواصفات استرجاع PNR قبل تفعيل الاتصال.',
    url: 'https://developers.amadeus.com/api-catalog',
  },
  {
    name: 'نسك مسار',
    description: 'تفعيل الاتصال يتطلب مواصفات API من الجهة المشغّلة لحساب الشريك المعتمد.',
    url: 'https://masar.nusuk.sa/landing/FAQ',
  },
  {
    name: 'البوابة المصرية للعمرة',
    description: 'تفعيل الاتصال يتطلب تأكيد وسيلة الربط ومواصفاتها من الوزارة أو الغرفة.',
    url: 'https://umrah.eg/home',
  },
];

const errorMessages: Record<string, string> = {
  invalid_input: 'راجع بيانات الربط والبيئة المختارة.',
  invalid_sample: 'راجع بيانات عينة الاختبار.',
  provider_auth_rejected: 'المزوّد رفض بيانات الدخول. راجع بيانات الـAPI والبيئة.',
  provider_access_rejected: 'المزوّد رفض الوصول للخدمة. راجع صلاحيات الحساب وبيانات الوكالة.',
  sample_not_verified: 'تعذّر تأكيد عينة الاختبار. تأكد أنها تخص نفس الحساب والبيئة.',
  document_type_unavailable: 'الاتصال لم يرجع نوع مستند الفاتورة.',
  provider_unavailable: 'تعذّر الاتصال بالمزوّد الآن. جرّب مرة أخرى.',
  configuration_unavailable: 'خدمة إعدادات التكامل غير متاحة حاليًا.',
  configuration_changed: 'تم تغيير الاتصال من جلسة أخرى. حدّث الحالة قبل المحاولة.',
  forbidden: 'إدارة التكاملات متاحة لمالك المؤسسة والأدمن المصرّح له.',
  session_required: 'سجّل الدخول مرة أخرى.',
  rate_limited: 'تم الوصول للحد المؤقت للاختبارات. حاول بعد دقيقة.',
  eta_sample_invalid: 'الصق طلب JSON بفاتورة اختبار واحدة موقّعة من نوع I إصدار 1.0، بحد أقصى 250 كيلوبايت.',
  eta_sample_id_conflict: 'المرجع الداخلي مستخدم بالفعل لعينة مختلفة في سجل الاختبار.',
  eta_sample_not_found: 'العينة غير موجودة في سجل المؤسسة.',
  eta_test_connection_required: 'يلزم اتصال ETA في بيئة الاختبار. تحديث عينة سابقة يتطلب نفس إعداد الاتصال وقت إرسالها.',
};

async function invoke<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke('company-api-integrations', { body });
  if (error) {
    const response: Response | undefined = error.context;
    const errorCode = response?.status === 429 ? 'rate_limited'
      : (await response?.json?.().catch(() => null))?.error;
    throw new Error(errorMessages[errorCode] ?? errorMessages.configuration_unavailable);
  }
  if (!data) throw new Error(errorMessages.configuration_unavailable);
  return data as T;
}

const environmentLabel = (environment: Environment) => environment === 'production' ? 'الإنتاج' : 'الاختبار';

export default function CompanyApiIntegrationsTab() {
  const { organizationId, orgRole } = useOrganization();
  if (!organizationId || (orgRole !== 'owner' && orgRole !== 'admin')) {
    return <p className="text-sm text-muted-foreground">{errorMessages.forbidden}</p>;
  }
  return <CompanyApiConnections key={organizationId} organizationId={organizationId} />;
}

function CompanyApiConnections({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['company-api-integrations', organizationId];
  const [selected, setSelected] = useState<{ connector: Connector; connection?: Connection; disconnect?: boolean } | null>(null);
  const [showEtaSamples, setShowEtaSamples] = useState(false);
  const query = useQuery({
    queryKey,
    queryFn: () => invoke<{ connections: Connection[] }>({ action: 'list', organizationId }),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">تكاملات المؤسسة</h2>
        <p className="mt-1 text-sm text-muted-foreground">أضف بيانات الـAPI الخاصة بمؤسستك واختبر الاتصال بالمزوّد.</p>
      </div>
      {query.isPending && <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل حالة التكاملات…</p>}
      {query.error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <span>{query.error.message}</span>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>
      </div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {connectors.map(connector => {
          const connection = query.data?.connections.find(row => row.provider === connector.id);
          return (
            <Card key={connector.id} className="flex flex-col">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{connector.name}</CardTitle>
                  {query.isSuccess && <Badge variant={connection ? 'default' : 'secondary'}>
                    {connection ? 'نجح الاختبار' : 'غير متصل'}
                  </Badge>}
                </div>
                <CardDescription>{connector.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                {connection && <p className="text-xs text-muted-foreground">
                  {environmentLabel(connection.environment)} · {new Date(connection.checked_at).toLocaleDateString()}
                </p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" disabled={!query.isSuccess} onClick={() => setSelected({ connector, connection })}>
                    <Plug className="me-2 h-4 w-4" />{connection ? 'استبدال بيانات الربط' : 'إعداد الاتصال'}
                  </Button>
                  {connection && <Button size="sm" variant="outline" onClick={() => setSelected({ connector, connection, disconnect: true })}>
                    <Unplug className="me-2 h-4 w-4" />فصل الاتصال
                  </Button>}
                  {connector.id === 'eta' && <Button size="sm" variant="outline" onClick={() => setShowEtaSamples(true)}>
                    سجل عينات الاختبار
                  </Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {pendingConnectors.map(connector => (
          <Card key={connector.name} className="flex flex-col">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{connector.name}</CardTitle>
                <Badge variant="secondary">بانتظار دعم الـAPI</Badge>
              </div>
              <CardDescription>{connector.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild size="sm" variant="outline">
                <a href={connector.url} target="_blank" rel="noreferrer"><ExternalLink className="me-2 h-4 w-4" />موقع المزوّد</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {selected && <ConnectionDialog {...selected} organizationId={organizationId} onClose={() => setSelected(null)} onSaved={refresh} />}
      {showEtaSamples && <EtaSamplesDialog organizationId={organizationId}
        connection={query.data?.connections.find(row => row.provider === 'eta')} onClose={() => setShowEtaSamples(false)} />}
    </section>
  );
}

const etaSampleStatusLabels = {
  sending: 'جارٍ الإرسال',
  not_sent: 'لم تُرسل. راجع اتصال الاختبار وحاول مجددًا بنفس الملف.',
  unknown: 'نتيجة الإرسال غير معلومة. تحقق من بوابة الاختبار قبل إرسال عينة بديلة.',
  submitted: 'استُلمت وجارٍ التحقق لدى ETA',
  valid: 'اجتازت التحقق في بيئة الاختبار',
  invalid: 'لم تجتز التحقق في بيئة الاختبار',
  rejected: 'رفضتها بيئة الاختبار',
  cancelled: 'أُلغيت في بيئة الاختبار',
};
type EtaSample = {
  id: string;
  internal_id: string;
  status: keyof typeof etaSampleStatusLabels;
  submission_id: string | null;
  document_id: string | null;
  checked_at: string;
};

function EtaSamplesDialog({ organizationId, connection, onClose }: {
  organizationId: string;
  connection?: Connection;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<EtaSample | null>(null);
  const canSend = connection?.environment === 'preproduction';
  const history = useQuery({
    queryKey: ['eta-sample-history', organizationId],
    queryFn: () => invoke<{ samples: EtaSample[] }>({ action: 'eta_sample_list', organizationId }),
    retry: false,
  });

  const run = async (request: object) => {
    if (busy) return null;
    setBusy(true);
    setError('');
    setLastResult(null);
    try {
      const { sample } = await invoke<{ sample: EtaSample }>({ organizationId, ...request });
      setLastResult(sample);
      return sample;
    } catch (error) {
      setError(error instanceof Error ? error.message : errorMessages.configuration_unavailable);
      return null;
    } finally {
      await history.refetch();
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || busy) return;
    const form = event.currentTarget;
    const sampleJson = new FormData(form).get('sampleJson');
    const result = await run({ action: 'eta_sample_submit', expectedRevision: connection.revision, sampleJson });
    if (result && result.status !== 'not_sent') form.reset();
  };

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>عينات ETA في بيئة الاختبار</DialogTitle>
        <DialogDescription>استخدم بيانات اختبار فقط. تُرسل فاتورة واحدة موقّعة مسبقًا إلى بيئة الاختبار، ويُحفظ المرجع والحالة في سجل العينات.</DialogDescription>
      </DialogHeader>
      {canSend ? <form onSubmit={submit} autoComplete="off" className="space-y-2">
        <Label htmlFor="eta-signed-test-invoice">طلب فاتورة الاختبار الموقّعة بصيغة JSON</Label>
        <Textarea id="eta-signed-test-invoice" name="sampleJson" dir="ltr" spellCheck={false} maxLength={250000} required disabled={busy} />
        <Button type="submit" disabled={busy} size="sm">إرسال عينة الاختبار</Button>
      </form> : <p className="text-sm text-muted-foreground">أعدّ اتصال ETA في بيئة الاختبار لإرسال عينة.</p>}
      {lastResult && <p role="status" className="text-sm">{etaSampleStatusLabels[lastResult.status]}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">سجل العينات</h3>
          <Button size="sm" variant="outline" onClick={() => void history.refetch()} disabled={busy || history.isFetching}>تحديث السجل</Button>
        </div>
        {history.isPending && <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل السجل…</p>}
        {history.error && <p role="alert" className="text-sm text-destructive">{history.error.message}</p>}
        {history.isSuccess && history.data.samples.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عينات مسجلة.</p>}
        {history.data?.samples.map(sample => <article key={sample.id} className="space-y-1 rounded-md border p-3 text-sm">
          <p className="font-medium"><bdi>{sample.internal_id}</bdi> · {etaSampleStatusLabels[sample.status]}</p>
          {sample.submission_id && <p className="break-all text-muted-foreground">مرجع الإرسال <bdi>{sample.submission_id}</bdi></p>}
          {sample.document_id && <p className="break-all text-muted-foreground">مرجع المستند <bdi>{sample.document_id}</bdi></p>}
          {sample.status === 'submitted' && <Button size="sm" variant="outline" disabled={busy || !canSend}
            onClick={() => void run({ action: 'eta_sample_refresh', sampleId: sample.id })}>تحقق من حالة العينة</Button>}
        </article>)}
      </div>
    </DialogContent>
  </Dialog>;
}

function ConnectionDialog({ connector, connection, disconnect, organizationId, onClose, onSaved }: {
  connector: Connector;
  connection?: Connection;
  disconnect?: boolean;
  organizationId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [environment, setEnvironment] = useState<Environment>(connection?.environment ?? 'preproduction');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    formElement.reset();
    setSaving(true);
    setError('');
    try {
      const request = {
        organizationId, provider: connector.id, expectedRevision: connection?.revision ?? null,
      };
      const result = disconnect
        ? await invoke<{ ok: boolean }>({ ...request, action: 'disconnect' })
        : await invoke<{ ok: boolean }>({
          ...request,
          action: 'connect',
          environment,
          credentials: Object.fromEntries(connector.fields.map(field => [field.name, form.get(field.name)])),
          sample: connector.id === 'zatca'
            ? { uuid: form.get('uuid'), invoiceHash: form.get('invoiceHash'), invoice: String(form.get('invoice') ?? '').replace(/\s/g, '') }
            : String(form.get('pnr') ?? '').trim().toUpperCase(),
        });
      if (result.ok !== true) throw new Error(errorMessages.configuration_unavailable);
      await onSaved();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : errorMessages.configuration_unavailable);
      if (error instanceof Error && error.message === errorMessages.configuration_changed) {
        await onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{connector.name}</DialogTitle>
          <DialogDescription>
            {disconnect ? 'هيتم حذف بيانات الربط المحفوظة لهذا المزوّد من حساب المؤسسة.' : 'يتم حفظ البيانات بعد نجاح الاختبار.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          {!disconnect && <>
            {connector.id !== 'zatca' && <div className="space-y-1">
              <Label htmlFor="company-api-environment">البيئة</Label>
              <Select value={environment} onValueChange={value => setEnvironment(value as Environment)} disabled={saving}>
                <SelectTrigger id="company-api-environment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preproduction">الاختبار</SelectItem>
                  <SelectItem value="production">الإنتاج</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            {connector.fields.map(field => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={'company-api-' + field.name}>{field.label}</Label>
                <Input id={'company-api-' + field.name} name={field.name} required dir="ltr" spellCheck={false}
                  type={field.secret ? 'password' : 'text'} autoComplete={field.secret ? 'new-password' : 'off'}
                  disabled={saving} maxLength={field.name === 'csid' ? 8192 : field.name === 'accessGroup' ? 100 : 1024} />
              </div>
            ))}
            {(connector.id === 'travelport' || connector.id === 'sabre') && <div className="space-y-1">
              <Label htmlFor="company-api-pnr">رقم PNR تابع للوكالة في البيئة المختارة</Label>
              <Input id="company-api-pnr" name="pnr" required dir="ltr" minLength={6} maxLength={6}
                pattern="[A-Za-z0-9]{6}" disabled={saving} />
            </div>}
            {connector.id === 'zatca' && <div className="space-y-2">
              <p className="text-sm text-muted-foreground">استخدم عينة موقّعة مخصّصة لمنصة المحاكاة.</p>
              <Label htmlFor="company-api-uuid">UUID</Label>
              <Input id="company-api-uuid" name="uuid" required dir="ltr" maxLength={36} disabled={saving} />
              <Label htmlFor="company-api-hash">Invoice Hash</Label>
              <Input id="company-api-hash" name="invoiceHash" required dir="ltr" maxLength={44} disabled={saving} />
              <Label htmlFor="company-api-invoice">XML بصيغة Base64</Label>
              <Textarea id="company-api-invoice" name="invoice" required dir="ltr" maxLength={570000} disabled={saving} />
            </div>}
            <a href={connector.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary underline">
              <ExternalLink className="h-4 w-4" /> توثيق المزوّد
            </a>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} variant={disconnect ? 'destructive' : 'default'}>
              {saving && <LoaderCircle className="me-2 h-4 w-4 animate-spin" />}
              {disconnect ? 'فصل الاتصال' : 'اختبار وحفظ'}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
