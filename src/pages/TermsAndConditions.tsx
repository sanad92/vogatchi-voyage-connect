import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return <main dir="rtl" className="min-h-screen bg-background text-foreground"><article className="mx-auto max-w-3xl px-6 py-12 space-y-6 leading-8">
    <h1 className="text-3xl font-bold">الشروط والأحكام — SafarERP</h1>
    <p className="text-muted-foreground">تسري هذه الشروط على استخدام منصة SafarERP لإدارة أعمال شركات السياحة والسفر.</p>
    <section><h2 className="text-xl font-semibold">1. الخدمة والحساب</h2><p>توفر المنصة أدوات لإدارة العملاء والحجوزات والعروض والحسابات والتواصل. يجب تقديم بيانات تسجيل صحيحة والمحافظة على سرية بيانات الدخول. يتحمل صاحب الحساب مسؤولية منح الصلاحيات لموظفيه.</p></section>
    <section><h2 className="text-xl font-semibold">2. الاشتراكات والمدفوعات</h2><p>تُعرض الخطة والسعر ودورية الفوترة قبل إتمام الدفع. لا يُعد الاشتراك مفعّلًا إلا بعد التحقق من نجاح الدفع. قد تتغير الأسعار للمدد المستقبلية مع الإعلان عن التغيير قبل سريانه، دون تطبيق زيادة بأثر رجعي على مدة مدفوعة.</p></section>
    <section><h2 className="text-xl font-semibold">3. التجربة المجانية</h2><p>قد تتوفر تجربة مجانية بحدود استخدام محددة كما هو موضح أثناء التسجيل. لا تعني التجربة المجانية الالتزام بإتاحة جميع المزايا دون قيود.</p></section>
    <section><h2 className="text-xl font-semibold">4. الاستخدام المسموح</h2><p>يُحظر استخدام المنصة في أنشطة غير قانونية أو إرسال رسائل مخالفة لسياسات مقدمي الخدمة أو محاولة الوصول إلى بيانات شركات أخرى. تظل الشركة المشتركة مسؤولة عن صحة حجوزاتها والتزاماتها تجاه عملائها ومورديها.</p></section>
    <section><h2 className="text-xl font-semibold">5. الخدمات الخارجية</h2><p>قد تعتمد بعض المزايا على خدمات مستقلة مثل بوابات الدفع وWhatsApp والبريد الإلكتروني. يخضع استخدام هذه الخدمات أيضًا لشروط مزوديها وقد يتأثر بتوافرها.</p></section>
    <section><h2 className="text-xl font-semibold">6. إيقاف الاشتراك</h2><p>يمكن طلب عدم تجديد الاشتراك من خلال قنوات الدعم المتاحة في المنصة. يظل الوصول إلى المزايا المدفوعة مرتبطًا بحالة الاشتراك وسريان مدته، مع مراعاة الحقوق التي يقررها القانون.</p></section>
    <section><h2 className="text-xl font-semibold">7. البيانات والخصوصية</h2><p>يرجى الاطلاع على <Link to="/privacy" className="underline text-primary">سياسة الخصوصية</Link> لمعرفة كيفية التعامل مع البيانات. يجب على الشركة المشتركة الحصول على الموافقات اللازمة لمعالجة بيانات عملائها.</p></section>
    <section><h2 className="text-xl font-semibold">8. الدعم والنزاعات</h2><p>للاستفسارات والشكاوى، يرجى التواصل عبر قنوات الدعم المعروضة داخل المنصة. لا تحد هذه الشروط من الحقوق الإلزامية التي يمنحها القانون للمستخدم.</p></section>
    <p className="border-t pt-4 text-sm">راجع أيضًا <Link to="/refund-policy" className="underline text-primary">سياسة الاسترداد والإلغاء</Link>.</p>
  </article></main>;
}
