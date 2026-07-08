import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12" dir="rtl">
        <h1 className="text-3xl font-bold mb-2">سياسة الخصوصية</h1>
        <p className="text-sm text-muted-foreground mb-8">آخر تحديث: 8 يوليو 2026</p>

        <section className="space-y-4 text-sm leading-7">
          <h2 className="text-xl font-semibold">من نحن</h2>
          <p>
            Vogatchi Trips منصة SaaS لإدارة عمليات وكالات السفر، تشمل خدمة WhatsApp Business لإدارة محادثات العملاء.
          </p>

          <h2 className="text-xl font-semibold">البيانات التي نجمعها</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>معلومات الحساب: الاسم، البريد، رقم الهاتف، والمنظمة.</li>
            <li>محادثات WhatsApp: الرسائل الواردة والصادرة عبر رقم أعمال منظمتك.</li>
            <li>بيانات ربط Meta: WhatsApp Business Account ID، معرّف رقم الهاتف، ورمز وصول Meta الخاص بمنظمتك.</li>
            <li>سجلات الأحداث الفنية لأغراض الأمان والتشغيل.</li>
          </ul>

          <h2 className="text-xl font-semibold">كيف نستخدم البيانات</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>إرسال واستقبال رسائل WhatsApp نيابة عن منظمتك.</li>
            <li>حفظ سجل المحادثات داخل حساب منظمتك فقط (عزل tenant صارم عبر Row-Level Security).</li>
            <li>تحسين الخدمة، ومنع الاستخدام السيّئ، والوفاء بمتطلبات Meta و WhatsApp Business Platform.</li>
          </ul>

          <h2 className="text-xl font-semibold">المشاركة مع أطراف ثالثة</h2>
          <p>لا نبيع بياناتك. نشاركها فقط مع:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>Meta / WhatsApp Cloud API لتسليم الرسائل.</li>
            <li>مزودي البنية التحتية (Supabase) لتخزين آمن مشفَّر.</li>
          </ul>

          <h2 className="text-xl font-semibold">الاحتفاظ بالبيانات</h2>
          <p>نحتفظ ببيانات المحادثات طالما اشتراكك نشط. يمكنك طلب الحذف في أي وقت.</p>

          <h2 className="text-xl font-semibold">حقوقك</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>الوصول لبياناتك أو تصديرها.</li>
            <li>تعديلها أو حذفها عبر <Link to="/data-deletion" className="text-primary underline">صفحة حذف البيانات</Link>.</li>
            <li>فصل ربط WhatsApp من داخل لوحة الإدارة في أي وقت.</li>
          </ul>

          <h2 className="text-xl font-semibold">التواصل</h2>
          <p>للاستفسارات: <a href="mailto:privacy@vogatchi.com" className="text-primary underline">privacy@vogatchi.com</a></p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
