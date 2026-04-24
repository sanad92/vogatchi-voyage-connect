
# فصل لوحة المنصة (Platform Admin) عن لوحات المؤسسات

## الوضع الحالي
- جدول `platform_roles` موجود ويحتوي على دورين: `platform_owner` و `platform_admin`، ودالة `is_platform_admin()` و `has_platform_role()` جاهزتان.
- صفحات لوحة المنصة موجودة بالفعل تحت `/platform-admin/*` ومحمية بـ `PlatformAdminGuard`، لكنها **مدمجة داخل نفس الـ DashboardLayout** ونفس الشريط الجانبي مع لوحة المؤسسة، فيظهر للسوبر أدمن خلط بين أدوات المنصة وأدوات المؤسسة (CRM، حجوزات، فواتير... إلخ).
- المستخدم `admin@vogatchi.com` حالياً عضو في مؤسستين بدور `owner` بالإضافة لكونه `platform_owner` — وهذا هو سبب رؤيته لكل شيء مختلطاً.

## الهدف
1. **Layout مستقل** للوحة المنصة على المسار `/platform/*` بشريط جانبي خاص فيه تبويبات المنصة فقط (لا CRM ولا حجوزات).
2. **مستخدم منصة نقي** لا ينتمي لأي مؤسسة، يدخل ويرى لوحة المنصة مباشرة بدون أي شيء من أدوات المؤسسة.
3. **تنظيم كامل لـ الاشتراكات والحسابات على مستوى المنصة** في صفحات مخصّصة.
4. **Impersonation اختياري**: زر "الدخول كمؤسسة" يسمح للسوبر أدمن بمعاينة لوحة مؤسسة محددة عند الحاجة، ويرجع منها بضغطة واحدة.

---

## الخطة

### 1. Layout وتنقل مستقلان للمنصة
- إنشاء `src/components/platform-admin/PlatformLayout.tsx`: layout كامل مستقل (Sidebar + Topbar + Breadcrumb)، بهوية بصرية مميزة (لون كهرماني/أحمر) ليتضح أنها بيئة منصة لا بيئة مؤسسة.
- `PlatformSidebar` يحتوي فقط على:
  - نظرة عامة
  - المؤسسات
  - الاشتراكات والخطط
  - التحويلات البنكية والمدفوعات
  - الحسابات (المستخدمون على مستوى المنصة + سجلات التدقيق)
  - إعدادات المنصة (الباكاب، الأمان، النظام، الصلاحيات، صفحة الهبوط)
  - أدوات المطور (Database Manager، Monitoring)

### 2. إعادة هيكلة المسارات
- نقل جميع `/platform-admin/*` إلى `/platform/*` تحت `<PlatformLayout>` بدلاً من `<DashboardLayout>`.
- تبقى لوحة المؤسسة على `/dashboard` و `/customers` ... إلخ كما هي.
- إضافة صفحات جديدة:
  - `/platform/accounts` — إدارة مستخدمي المنصة (عرض/إضافة/إزالة `platform_admin` و `platform_owner`).
  - `/platform/audit` — سجل التدقيق على مستوى المنصة.
  - `/platform/plans` — إدارة خطط الاشتراك (إنشاء/تعديل خطط، أسعار، حدود).

### 3. توجيه ذكي عند تسجيل الدخول
- بعد تسجيل الدخول، إذا كان المستخدم:
  - `platform_admin/owner` **بدون أي عضوية في مؤسسة** → توجيه مباشر إلى `/platform`.
  - `platform_admin/owner` **مع عضوية في مؤسسات** → توجيه إلى `/dashboard` افتراضياً مع زر "الانتقال إلى لوحة المنصة" بارز في الـ Topbar.
  - مستخدم عادي → `/dashboard` كما هو.

### 4. مستخدم خاص بالمنصة
- إنشاء صفحة `/platform/accounts` فيها:
  - زر "إضافة مدير منصة جديد" يستدعي edge function تنشئ مستخدم في `auth.users` + تضيفه لـ `platform_roles` **بدون** إضافته لأي `organization_members`.
  - قائمة بكل مديري المنصة الحاليين مع صلاحياتهم وتاريخ الإنشاء.
  - زر إزالة (محمي بحيث لا يمكن إزالة آخر `platform_owner`).

### 5. الاشتراكات والحسابات (تعميق)
- صفحة `/platform/subscriptions` (تطوير الموجود):
  - عرض كل الاشتراكات عبر كل المؤسسات مع فلاتر (نشط/تجريبي/منتهي/في فترة سماح).
  - إجراءات سريعة: تمديد تجربة، ترقية/تنزيل خطة، إلغاء، إعادة تفعيل.
  - رسوم بيانية: MRR (الإيراد الشهري المتكرر)، عدد المؤسسات النشطة، Churn rate.
- صفحة `/platform/plans` جديدة:
  - CRUD على `subscription_plans` (الاسم، السعر الشهري/السنوي، الحد الأقصى للمستخدمين/الحجوزات/التخزين).
- صفحة `/platform/transfers` (تطوير الموجود): مراجعة وقبول/رفض التحويلات البنكية اليدوية.

### 6. وضع المعاينة (Impersonation)
- في صفحة `/platform/organizations` لكل مؤسسة زر "دخول كهذه المؤسسة".
- يخزن `localStorage.platform_impersonating_org_id` ويوجه إلى `/dashboard`.
- شريط علوي ملوّن أعلى لوحة المؤسسة يقول "أنت تعاين بصفة [اسم المؤسسة] — رجوع للمنصة" بزر خروج.

### 7. حماية أمنية
- جميع مسارات `/platform/*` محمية بـ `PlatformAdminGuard`.
- لوحة المؤسسة `/dashboard/*` تظل تعمل كما هي للمستخدمين العاديين.
- مستخدم المنصة النقي (بدون مؤسسات) يمنع من الوصول إلى `/dashboard` تلقائياً ويعاد توجيهه لـ `/platform`.

---

## التفاصيل التقنية

**ملفات جديدة:**
- `src/components/platform-admin/PlatformLayout.tsx`
- `src/components/platform-admin/PlatformSidebar.tsx`
- `src/components/platform-admin/PlatformTopbar.tsx`
- `src/components/platform-admin/ImpersonationBanner.tsx`
- `src/pages/platform-admin/PlatformAdminAccounts.tsx`
- `src/pages/platform-admin/PlatformAdminPlans.tsx`
- `src/pages/platform-admin/PlatformAdminAudit.tsx`
- `src/hooks/useImpersonation.tsx` (موجود — سنتأكد من ملاءمته أو نطوّره)

**ملفات معدّلة:**
- `src/App.tsx` — مجموعة Routes جديدة `/platform/*` تحت `PlatformLayout`، مع إبقاء `/platform-admin/*` كـ redirects للتوافق الخلفي.
- `src/components/layout/DashboardSidebar.tsx` — إزالة قسم "إدارة المنصة" من شريط لوحة المؤسسة، واستبداله بزر واحد علوي "الذهاب إلى لوحة المنصة" يظهر فقط لـ platform admins.
- `src/pages/LoginPage.tsx` — منطق التوجيه الذكي بعد تسجيل الدخول.

**Edge Function جديدة:**
- `supabase/functions/platform-create-admin/index.ts` — إنشاء مستخدم منصة جديد بشكل آمن (محمي بـ `platform_owner` فقط).

**Migration:**
- لا تغييرات على الـ Schema (الجداول `platform_roles`, `subscriptions`, `subscription_plans` كلها موجودة وكافية).

**ملاحظة:** ميزة ربط WhatsApp Business Cloud (Meta Embedded Signup) متوقفة مؤقتاً وسنكمل تنفيذها بعد الانتهاء من فصل لوحة المنصة.

---

هل أبدأ التنفيذ؟ لو عندك تفضيل حول نقطة معينة (مثلاً ألوان لوحة المنصة، أو هل تريد تفعيل الـ Impersonation أصلاً) قولي قبل البدء.
