import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { callUntypedRpc } from '@/lib/supabaseRpc';

const confirmationFormat = /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;
const DataDeletion: React.FC = () => {
  const [params] = useSearchParams();
  const code = params.get('code');
  const validCode = Boolean(code && confirmationFormat.test(code));
  const confirmation = useQuery({
    queryKey: ['meta-deletion-confirmation', code],
    enabled: validCode,
    retry: false,
    gcTime: 0,
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
          <div className="mb-6 rounded-md border bg-card p-4 text-sm" role="status">
            تم تسجيل طلب حذف البيانات وهو بانتظار المراجعة.
            <div className="mt-2 break-all font-mono text-xs" dir="ltr">{code}</div>
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
              <strong>من داخل المنصة</strong> استخدم «فصل الحساب» من إعدادات WhatsApp لإيقاف اتصال حساب الشركة.
            </li>
            <li>
              <strong>عبر البريد</strong> أرسل طلبًا إلى
              {' '}<a href="mailto:privacy@vogatchi.com" className="text-primary underline">privacy@vogatchi.com</a>{' '}
              مع رمز تأكيد الطلب إن كان لديك، حتى نتمكن من متابعة المراجعة.
            </li>
            <li>
              <strong>عبر Meta</strong> استخدم الرابط الذي يقدمه Meta لمتابعة حالة طلبك.
            </li>
          </ol>

          <p className="text-muted-foreground">
            تحدد المراجعة البيانات المرتبطة بالطلب وما يمكن حذفه ضمن نطاقه.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DataDeletion;
