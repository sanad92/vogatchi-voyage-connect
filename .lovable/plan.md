# خطة Rebranding كاملة → Vogantra

## نظرة عامة

تحويل المنصة بالكامل من **Hostretor.online** إلى **Vogantra — منصة ERP لشركات السياحة**، مع تطبيق الهوية البصرية الجديدة (ألوان + خطوط + نبرة) وتحديث Landing Page بالكامل بمحتوى عربي أساسي + إنجليزي ثانوي.

---

## 1. الهوية البصرية (Design System)

### تحديث `src/index.css`
استبدال متغيرات الألوان لتعكس Vogantra Palette:

| المتغير | القيمة (HSL) | اللون |
|---|---|---|
| `--primary` | `199 89% 48%` | Sky Blue `#0EA5E9` |
| `--secondary` | `222 47% 11%` | Midnight Blue `#0F172A` |
| `--accent` | `160 84% 39%` | Emerald `#10B981` |
| `--sidebar-background` | `222 47% 11%` | Midnight Blue (بدل البنفسجي) |
| `--sidebar-primary` | `199 89% 48%` | Sky Blue |
| `--ring` | `199 89% 48%` | Sky Blue |
| `--chart-1..5` | درجات من Sky/Emerald/Midnight | تناسق مع البراند |

نفس الشيء للوضع `.dark` بدرجات مظلمة محسوبة.

### تحديث `index.html`
- إضافة Google Fonts: **Cairo** (عربي) + **Inter** (إنجليزي).
- تحديث `<title>` إلى `Vogantra — Powering Travel Business`.
- تحديث `<meta description>` و OG/Twitter tags بمحتوى Vogantra.
- تحديد `lang="ar" dir="rtl"`.

### تحديث `tailwind.config.ts`
- إضافة `fontFamily`: `cairo`, `inter`.
- إعداد `font-sans` ليستخدم Cairo + Inter كـ fallback.

---

## 2. اللوجو والـ Favicon

- إنشاء مكوّن `src/components/brand/VogantraLogo.tsx` يدعم variants: `full | mark | white`.
- مؤقتاً يعرض **SVG placeholder**: حرف V هندسي بأطراف جناح + نص "Vogantra" بخط Inter.
- استبدال `<img>` القديم في:
  - `src/components/auth/AuthHeader.tsx`
  - `src/components/landing/LandingHeader.tsx`
  - `src/components/landing/LandingFooter.tsx`
  - `src/components/layout/DashboardSidebar.tsx`
  - `src/components/platform-admin/PlatformSidebar.tsx`
- ترك ملاحظة في الكود: عند رفع المستخدم للوجو الرسمي، يستبدل `public/vogantra-logo.png` ويحدث المكون.
- حذف `public/favicon.ico` القديم وإضافة favicon SVG مؤقت من نفس الـ mark.

---

## 3. تحديث الاسم في كل المنصة

استبدال **Hostretor.online → Vogantra** و **Travel ERP System → ERP السياحة الذكي** في الملفات التالية:

- `src/components/auth/AuthHeader.tsx`, `AuthLayout.tsx`, `SupabaseAuthForm.tsx`
- `src/components/landing/LandingHeader.tsx`, `LandingFooter.tsx`, `ContactForm.tsx`
- `src/components/layout/DashboardSidebar.tsx`
- `src/pages/LoginPage.tsx`, `SignupPage.tsx`, `PricingPage.tsx`, `SaaSLanding.tsx`, `SubscriptionManagement.tsx`
- `src/pages/admin/CMSPages.tsx`, `src/components/admin/SiteSettings.tsx`
- `src/components/payment/BankTransferForm.tsx`
- `src/components/customers/CustomerQuickActions.tsx`
- ملفات الفواتير/الفاوتشر: `HotelVoucherGenerator.tsx`, `HotelInvoiceGenerator.tsx`, `HotelSupplierPaymentGenerator.tsx`

---

## 4. إعادة تصميم Landing Page

### `src/components/landing/LandingHero.tsx`
- العنوان الرئيسي (عربي): **"شغّل شركة السياحة بذكاء"**
- Sub-title إنجليزي صغير تحته: *Powering Travel Business*
- وصف: *منصة واحدة لإدارة الحجوزات، الحسابات، الموردين، الـ CRM، والتقارير.*
- زرّان: **ابدأ تجربة مجانية** (primary) + **احجز Demo** (outline).
- شارات (Badges): إدارة الحجوزات / حسابات وعمولات / CRM واتساب / تقارير أرباح / Multi-Branches / صلاحيات.
- خلفية: gradient من Midnight Blue إلى Sky Blue مع تأثير mesh خفيف.

### `src/components/landing/ServicesSection.tsx` (Features Grid)
6 بطاقات تعرض منتجات Vogantra:
1. **Vogantra Booking Engine** — حجوزات فنادق، طيران، نقل، رحلات.
2. **Vogantra Finance** — حسابات، فواتير، عمولات، تقارير أرباح.
3. **Vogantra CRM** — إدارة عملاء، واتساب، متابعات، segments.
4. **Vogantra HR** — موظفين، حضور، رواتب، صلاحيات.
5. **Vogantra Suppliers** — موردين، عقود، أسعار، allotments.
6. **Vogantra Analytics** — تقارير لحظية ولوحات قياس KPIs.

كل بطاقة: أيقونة Lucide + عنوان عربي + وصف سطر + accent بلون البراند.

### قسم جديد: **Why Vogantra?**
3 أعمدة: ⚡ سرعة • 🔒 أمان (RLS + Audit) • 📈 نمو (Multi-Tenant + Multi-Branch).

### قسم Pricing Teaser
بطاقات Free Trial / Pro / Enterprise مع زر "اعرف المزيد" يوجّه لـ `/pricing`.

### Footer
تحديث `LandingFooter.tsx`: شعار Vogantra، روابط (المنتج، الأسعار، تواصل، تسجيل الدخول)، حقوق `© 2026 Vogantra. All rights reserved.`

### حذف/تعديل الأقسام غير المناسبة لـ ERP
- `CitiesSection`, `HotelsSection`, `DirectContracts` خاصة بشركة سياحة B2C وليست منصة ERP. سنخفيها من الصفحة الرئيسية الجديدة (تبقى في الكود للاستخدام في CMS dynamic pages).

---

## 5. نبرة المراسلات والـ Auth

- تحديث `AuthHeader.tsx`: شعار Vogantra + "نظام إدارة شركة السياحة الذكي".
- تحديث Welcome Email في `supabase/functions/send-welcome-email/index.ts` ليبدأ بـ "أهلاً بك في Vogantra".

---

## التفاصيل التقنية (Technical Details)

- **عدم تغيير الـ schema أو الـ Supabase project ref** — فقط تغيير برندينغ على مستوى UI/Copy.
- لا توجد migrations مطلوبة.
- الـ DB column `system_settings.platform_name` سيتم تحديثه لـ "Vogantra" عبر `AdminSettings` لاحقاً (يدوي من قبل المستخدم) أو نضيف seed تلقائي خفيف.
- اللوجو الحالي في `public/lovable-uploads/4e5be0db-...png` يبقى كـ fallback لحد ما المستخدم يرفع لوجو Vogantra.

---

## الملفات اللي هتتعدل/تتنشأ

**جديد:**
- `src/components/brand/VogantraLogo.tsx`
- `public/vogantra-favicon.svg`

**تعديل:**
- `src/index.css` (Design tokens)
- `index.html` (Fonts + Meta)
- `tailwind.config.ts` (Font families)
- `src/components/landing/LandingHero.tsx` + `ServicesSection.tsx` + `LandingHeader.tsx` + `LandingFooter.tsx`
- `src/pages/LandingPage.tsx` (إعادة ترتيب الأقسام)
- ~15 ملف لاستبدال نصوص "Hostretor" → "Vogantra"

---

## بعد الموافقة

1. ابدأ التنفيذ فوراً.
2. بعد الانتهاء، ارفع لوجو Vogantra الرسمي وأنا أركّبه مكان الـ SVG placeholder.
3. خطوات لاحقة (مش في الخطة دي): تصميم Dashboard UI جديد كلياً بهوية Vogantra، صفحات قانونية (Terms/Privacy)، Email Templates احترافية.
