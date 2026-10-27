import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return <main dir="rtl" className="min-h-screen bg-background text-foreground"><article className="mx-auto max-w-3xl px-6 py-12 space-y-6 leading-8">
    <h1 className="text-3xl font-bold">سياسة الاسترداد والإلغاء — SafarERP</h1>
    <p className="text-muted-foreground">تنطبق هذه السياسة على رسوم الاشتراك في برنامج SafarERP، ولا تشمل المبالغ التي تتلقاها شركات السياحة المشتركة من عملائها مقابل حجوزات السفر.</p>
    <section><h2 className="text-xl font-semibold">1. إلغاء التجديد</h2><p>يمكنك طلب إلغاء تجديد الاشتراك عبر قنوات الدعم داخل المنصة. لا يؤدي إلغاء التجديد بحد ذاته إلى رد تلقائي للرسوم المدفوعة عن الفترة الحالية.</p></section>
    <section><h2 className="text-xl font-semibold">2. طلب استرداد الرسوم</h2><p>إذا تم الخصم بالخطأ أو تكررت عملية الدفع أو لم تُفعّل الخدمة رغم نجاح السداد، تواصل مع الدعم مع ذكر البريد المسجل ورقم العملية وتاريخها والمبلغ، دون إرسال بيانات البطاقة الكاملة أو رمز التحقق. تُراجع الطلبات والتحقق من المعاملات ويُبت فيها وفق الحالة وحقوق العميل المقررة قانونًا.</p></section>
    <section><h2 className="text-xl font-semibold">3. معالجة المبالغ المستردة</h2><p>عند قبول الاسترداد، يُعاد المبلغ من خلال وسيلة الدفع الأصلية حيثما كان ذلك متاحًا. يعتمد توقيت ظهور المبلغ على البنك أو مزود خدمة الدفع، ولا يمكن ضمان مدة موحدة لجميع الوسائل.</p></section>
    <section><h2 className="text-xl font-semibold">4. الرسوم الخارجية</h2><p>قد تُطبق رسوم مستقلة من مقدمي الخدمات الخارجية على استخدام خدماتهم، ولا تدخل تلقائيًا ضمن رسوم اشتراك SafarERP أو قرارات ردها.</p></section>
    <section><h2 className="text-xl font-semibold">5. الحقوق القانونية</h2><p>لا تنتقص هذه السياسة من أي حقوق استرداد أو إلغاء إلزامية مقررة بموجب القانون المعمول به.</p></section>
    <p className="border-t pt-4 text-sm">اقرأ <Link to="/terms" className="underline text-primary">الشروط والأحكام</Link> و<Link to="/privacy" className="underline text-primary">سياسة الخصوصية</Link>.</p>
  </article></main>;
}
