import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import SafarERPLogo from '@/components/brand/VogantraLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { normalizeContactPhone, validContactEmail, validContactName } from '@/lib/organizationContacts';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type InquiryReceipt = { accepted: true; reference: string };

const receiptPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const unconfirmedSubmission = 'تعذّر تأكيد استلام طلبك. حاول مرة تانية بنفس البيانات.';

export default function CustomPlanInquiry() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const inFlight = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const receiptHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (receipt) receiptHeading.current?.focus();
  }, [receipt]);

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || receipt) return;

    const form = new FormData(event.currentTarget);
    const getText = (name: string) => String(form.get(name) ?? '').trim();
    const companyName = getText('company');
    const contactName = getText('contact');
    const email = getText('email').toLowerCase();
    const rawPhone = getText('phone');
    const phone = rawPhone ? normalizeContactPhone(rawPhone) : null;
    const seats = getText('seats');
    const useCase = getText('use-case');
    const implementation = getText('implementation');
    const consent = form.get('consent') === 'on';

    if (!validContactName(companyName) || !validContactName(contactName)) {
      setErrorMessage('اكتب اسم الشركة واسم المسؤول، بحرفين على الأقل لكل اسم.');
      return;
    }
    if (email.length > 254 || !validContactEmail(email)) {
      setErrorMessage('اكتب بريد إلكتروني صالح للتواصل.');
      return;
    }
    if (rawPhone && !phone) {
      setErrorMessage('راجع رقم التليفون أو سيب الحقل فاضي.');
      return;
    }
    if (!useCase || !consent || (seats && !/^[1-9]\d{0,4}$/.test(seats))) {
      setErrorMessage('وضح استخدامك للباقة، وراجع عدد المستخدمين والموافقة على التواصل.');
      return;
    }

    const message = [
      useCase,
      seats ? `عدد المستخدمين المتوقع: ${seats}` : '',
      implementation ? `متطلبات التنفيذ: ${implementation}` : '',
    ].filter(Boolean).join('\n\n');
    const body = {
      _company_name: companyName,
      _contact_name: contactName,
      _email: email,
      _phone: phone,
      _message: message,
      _consent: consent,
      _honeypot: getText('website') || null,
    };
    const fingerprint = JSON.stringify(body);
    inFlight.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      let requestId = attempts.current.get(fingerprint);
      if (!requestId) {
        requestId = crypto.randomUUID();
        attempts.current.set(fingerprint, requestId);
      }
      const { data, error } = await callUntypedRpc<InquiryReceipt>('submit_platform_custom_plan_inquiry', {
        _request_id: requestId,
        ...body,
      }, query => query.abortSignal(controller.signal));

      if (error?.code === 'PT429') {
        setErrorMessage('اترسل عدد طلبات كبير في وقت قصير. حاول تاني بعد شوية.');
      } else if (error?.code === '22023') {
        setErrorMessage('الطلب ما اتقبلش. راجع البيانات وموافقتك على التواصل.');
      } else if (error || data?.accepted !== true || typeof data.reference !== 'string' || !receiptPattern.test(data.reference)) {
        setErrorMessage(unconfirmedSubmission);
      } else {
        attempts.current.clear();
        setReceipt(data.reference);
      }
    } catch {
      setErrorMessage(unconfirmedSubmission);
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <nav aria-label="روابط المنصة" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Safar ERP — الصفحة الرئيسية" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <SafarERPLogo size="sm" className="[&_img]:max-w-[115px] sm:[&_img]:max-w-none" />
          </Link>
          <Button asChild variant="ghost" className="min-h-11 gap-2 px-3">
            <Link to="/pricing">
              <ArrowRight className="size-4" aria-hidden="true" />
              الباقات
            </Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
        {receipt ? (
          <section aria-labelledby="inquiry-received-title" className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
            <CheckCircle2 aria-hidden="true" className="size-10 text-success" />
            <h1 id="inquiry-received-title" ref={receiptHeading} tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
              شكرًا، استلمنا طلب الباقة المخصصة
            </h1>
            <p className="leading-7 text-muted-foreground">فريق Safar ERP هيراجع احتياجاتك ويتواصل معاك على البيانات اللي سجلتها.</p>
            <div className="space-y-1 rounded-lg bg-muted p-4">
              <p className="text-sm font-semibold">رقم متابعة الطلب</p>
              <bdi className="block break-all font-mono text-sm">{receipt}</bdi>
            </div>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/pricing">الرجوع للباقات</Link>
            </Button>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
            <section aria-labelledby="custom-plan-title" className="rounded-2xl bg-brand-navy p-6 text-brand-ivory sm:p-8">
              <h1 id="custom-plan-title" className="text-3xl font-black leading-tight sm:text-4xl">
                اطلب باقة مخصصة لشركتك
              </h1>
              <p className="mt-4 leading-8 text-brand-ivory/80">
                احكي لنا عن شغل شركتك وحجم فريقك. هنراجع الموديولات والتكاملات اللي تحتاجها ونتواصل معاك عشان نحدد الباقة المناسبة.
              </p>
            </section>

            <section aria-labelledby="inquiry-form-title" className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              <h2 id="inquiry-form-title" className="text-xl font-bold">بيانات طلب الباقة</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">الحقول بعلامة * مطلوبة.</p>
              <form onSubmit={submitInquiry} className="mt-6 space-y-5">
                <fieldset disabled={isSubmitting} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="custom-plan-company">اسم الشركة *</Label>
                      <Input id="custom-plan-company" name="company" autoComplete="organization" minLength={2} maxLength={120} required className="min-h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-plan-contact">اسم المسؤول *</Label>
                      <Input id="custom-plan-contact" name="contact" autoComplete="name" minLength={2} maxLength={120} required className="min-h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-plan-email">البريد الإلكتروني للعمل *</Label>
                      <Input id="custom-plan-email" name="email" type="email" dir="ltr" autoComplete="email" maxLength={254} required className="min-h-11 text-left" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-plan-phone">رقم التليفون <span className="font-normal text-muted-foreground">(اختياري)</span></Label>
                      <Input id="custom-plan-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" maxLength={32} className="min-h-11 text-left" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-plan-seats">عدد المستخدمين المتوقع <span className="font-normal text-muted-foreground">(اختياري)</span></Label>
                    <Input id="custom-plan-seats" name="seats" type="number" min={1} max={99999} step={1} inputMode="numeric" className="min-h-11 sm:w-48" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-plan-use-case">إيه اللي محتاجه من الباقة؟ *</Label>
                    <Textarea id="custom-plan-use-case" name="use-case" maxLength={950} rows={3} required
                      placeholder="مثلاً إدارة حجوزات الفروع أو متابعة المبيعات والتحصيل." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-plan-implementation">متطلبات التنفيذ <span className="font-normal text-muted-foreground">(اختياري)</span></Label>
                    <Textarea id="custom-plan-implementation" name="implementation" maxLength={400} rows={2}
                      placeholder="مثلاً ترحيل البيانات أو تدريب الفريق أو ربط نظام تاني." />
                  </div>
                  <div className="hidden" aria-hidden="true">
                    <Label htmlFor="custom-plan-website">الموقع الإلكتروني</Label>
                    <Input id="custom-plan-website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-3">
                      <input id="custom-plan-consent" name="consent" type="checkbox" required
                        className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                      <label htmlFor="custom-plan-consent" className="text-sm leading-6">
                        أوافق إن فريق Safar ERP يتواصل معايا بخصوص الطلب ده. *
                      </label>
                    </div>
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="ms-7 mt-1 inline-block rounded-sm text-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      سياسة الخصوصية
                    </Link>
                  </div>
                </fieldset>
                {errorMessage && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                    {errorMessage}
                  </p>
                )}
                <Button type="submit" disabled={isSubmitting} className="min-h-12 w-full gap-2 font-bold sm:w-auto">
                  {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الباقة'}
                </Button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
