import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { callUntypedRpc } from '@/lib/supabaseRpc';

const confirmationFormat = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const DataDeletion: React.FC = () => {
  const [params] = useSearchParams();
  const code = params.get('code');
  const validCode = Boolean(code && confirmationFormat.test(code));
  const confirmation = useQuery({
    queryKey: ['meta-deletion-confirmation', code],
    enabled: validCode,
    retry: false,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<boolean>('verify_meta_deletion_confirmation', { _confirmation_code: code });
      if (error) throw error;
      return data === true;
    },
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12" dir="rtl">
        <h1 className="text-3xl font-bold mb-4">طلب حذف البيانات</h1>

        {code && confirmation.isSuccess && confirmation.data ? (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            تم تسجيل طلب حذف البيانات. احتفظ بالرمز للاستفسار عن المعالجة.
            <div className="mt-2 font-mono text-xs bg-white p-2 rounded border">{code}</div>
          </div>
        ) : code && (
          <p className="mb-6 text-sm" role={confirmation.isError ? 'alert' : 'status'}>
            {confirmation.isLoading ? 'جارٍ التحقق من الطلب…' : confirmation.isError
              ? 'تعذّر التحقق من طلب الحذف حاليًا. حاول مرة أخرى أو تواصل معنا بالبريد.'
              : 'رمز طلب الحذف غير صالح أو غير مسجّل.'}
          </p>
        )}

        <section className="space-y-4 text-sm leading-7">
          <p>
            يمكنك طلب حذف كافة بياناتك المرتبطة بخدمة WhatsApp Business على منصة SafarERP عبر إحدى الطرق التالية:
          </p>
          <ol className="list-decimal pr-6 space-y-2">
            <li>
              <strong>من داخل المنصة:</strong> افتح لوحة إدارة WhatsApp ← الإعدادات ← <em>فصل الحساب</em>. هذا يوقف الاستقبال/الإرسال فورًا ويحذف رمز الوصول الخاص بمنظمتك.
            </li>
            <li>
              <strong>عبر البريد:</strong> أرسل طلبًا إلى
              {' '}<a href="mailto:privacy@vogatchi.com" className="text-primary underline">privacy@vogatchi.com</a>{' '}
              مع ذكر معرّف المنظمة ورقم WhatsApp Business. سنؤكد الحذف خلال 7 أيام عمل.
            </li>
            <li>
              <strong>عبر Meta:</strong> استخدم الرابط الذي يقدمه Meta للتحقق من تسجيل طلبك.
            </li>
          </ol>

          <h2 className="text-xl font-semibold mt-8">ما الذي يُحذف</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>رمز الوصول الخاص بحساب WhatsApp Business الخاص بمنظمتك.</li>
            <li>سجل محادثات ورسائل WhatsApp المرتبطة بالمنظمة.</li>
            <li>سجلات ربط/فصل الحساب.</li>
          </ul>

          <p className="text-muted-foreground text-xs mt-8">
            ملاحظة: قد نحتفظ ببعض السجلات المحاسبية أو الأمنية للفترة التي يقتضيها القانون.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DataDeletion;
