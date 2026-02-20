
# خطة تحويل النظام إلى SaaS كامل

## نظرة عامة
تحويل نظام Vogatchi CRM من نظام أحادي الشركة إلى منصة SaaS متعددة الشركات (Multi-tenant)، حيث كل شركة سياحة تسجل وتحصل على مساحة خاصة بها مع عزل كامل للبيانات.

## الوضع الحالي
- 65+ جدول في قاعدة البيانات بدون أي فصل بين الشركات
- سياسات RLS تسمح لأي مستخدم مسجل بالوصول لكل شيء (`USING (true)`)
- لا يوجد مفهوم "شركة" أو "مؤسسة" في النظام
- صفحة تسجيل دخول واحدة بدون أي صفحة تسويقية حقيقية

---

## المرحلة 1: البنية التحتية للـ Multi-tenancy

### 1.1 إنشاء جدول المؤسسات (organizations)
```text
organizations
  - id (UUID, PK)
  - name (اسم الشركة)
  - slug (رابط فريد مثل: vogatchi)
  - logo_url
  - phone, email, address
  - plan (free / basic / pro / enterprise)
  - plan_expires_at
  - max_users (عدد المستخدمين المسموح)
  - is_active
  - created_at, updated_at
```

### 1.2 ربط المستخدمين بالمؤسسات
```text
organization_members
  - id (UUID, PK)
  - organization_id -> organizations(id)
  - user_id -> auth.users(id)
  - role (owner / admin / manager / agent / viewer)
  - is_active
  - joined_at
```

### 1.3 إضافة عمود `organization_id` لكل الجداول الـ 65+
سيتم إضافة عمود `organization_id` (UUID, FK -> organizations) لكل جدول بيانات تجاري مثل:
- customers, hotel_bookings, flight_bookings, car_rentals, transport_bookings
- invoices, invoice_items, suppliers, employees
- expense_transactions, bank_accounts, bank_account_transactions
- وباقي الجداول...

### 1.4 تحديث سياسات RLS
تحويل كل السياسات من `USING (true)` إلى:
```text
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
)
```
مع استخدام `SECURITY DEFINER` function لتجنب مشاكل الـ recursion.

---

## المرحلة 2: صفحة هبوط تسويقية + تسجيل الشركات

### 2.1 صفحة Landing Page جديدة (/)
- عرض مميزات النظام كمنصة SaaS
- خطط الأسعار (مجاني / أساسي / احترافي / مؤسسات)
- شهادات العملاء
- زر "ابدأ الآن مجاناً"
- تصميم عصري وجذاب

### 2.2 تدفق التسجيل الجديد
```text
[صفحة الهبوط] -> [إنشاء حساب] -> [تسجيل بيانات الشركة] -> [لوحة التحكم]
```
- المستخدم يسجل حسابه الشخصي (بريد + كلمة مرور)
- ثم يُطلب منه إنشاء مؤسسة أو الانضمام لواحدة بدعوة
- عند إنشاء مؤسسة جديدة، يصبح صاحبها (owner)
- يحصل تلقائياً على خطة مجانية

### 2.3 صفحة Onboarding
بعد التسجيل، خطوات إعداد أولية:
1. بيانات الشركة الأساسية
2. إضافة أول موظف/مستخدم
3. استيراد العملاء (اختياري)
4. جولة تعريفية بالنظام

---

## المرحلة 3: نظام الخطط والاشتراكات (يدوي)

### 3.1 جدول الخطط
```text
subscription_plans
  - id, name, name_ar
  - price_monthly, price_yearly
  - max_users, max_bookings_per_month
  - features (JSONB: قائمة بالمميزات المتاحة)
  - is_active
```

### 3.2 جدول الاشتراكات
```text
subscriptions
  - id
  - organization_id
  - plan_id
  - status (active / expired / cancelled)
  - starts_at, expires_at
  - payment_method (تحويل بنكي / نقدي)
  - payment_reference
  - notes
  - activated_by (super_admin)
```

### 3.3 لوحة تحكم Super Admin
صفحة خاصة بمالك المنصة لإدارة:
- كل المؤسسات المسجلة
- تفعيل/إيقاف الاشتراكات يدوياً
- إحصائيات عامة عن المنصة
- إدارة الخطط والأسعار

---

## المرحلة 4: تعديل كل الكود الحالي

### 4.1 Context جديد للمؤسسة
إنشاء `OrganizationProvider` يوفر:
- `currentOrganization` - بيانات المؤسسة الحالية
- `switchOrganization()` - للمستخدمين بأكثر من مؤسسة
- تمرير `organization_id` تلقائياً مع كل عملية CRUD

### 4.2 تعديل كل الـ hooks
كل hook يتعامل مع قاعدة البيانات سيتم تعديله ليضيف فلتر `organization_id`:
```text
// قبل
supabase.from('customers').select('*')

// بعد
supabase.from('customers').select('*').eq('organization_id', currentOrgId)
```

### 4.3 تعديل عمليات الإنشاء
كل `INSERT` سيتضمن `organization_id` تلقائياً.

### 4.4 تعديل الـ Navbar
- عرض اسم المؤسسة الحالية
- إمكانية التبديل بين المؤسسات (لو المستخدم عضو في أكثر من واحدة)

---

## المرحلة 5: حدود الاستخدام والتحكم

### 5.1 فحص الحدود
قبل كل عملية إنشاء، فحص:
- هل وصل عدد المستخدمين للحد الأقصى؟
- هل الاشتراك نشط أم منتهي؟
- هل تجاوز عدد الحجوزات الشهرية؟

### 5.2 صفحة "انتهى اشتراكك"
عند انتهاء الاشتراك:
- إظهار رسالة واضحة
- السماح بالقراءة فقط (لا إنشاء أو تعديل)
- زر للتواصل لتجديد الاشتراك

---

## خطة التنفيذ المقترحة

بسبب حجم التغييرات الكبير جداً (65+ جدول + عشرات الملفات)، سيتم التنفيذ على مراحل:

| المرحلة | المحتوى | الرسائل المتوقعة |
|---------|---------|-----------------|
| 1 | جداول organizations + organization_members + RLS | 2-3 رسائل |
| 2 | إضافة organization_id للجداول الرئيسية (دفعات) | 3-5 رسائل |
| 3 | صفحة هبوط + تسجيل شركات + onboarding | 2-3 رسائل |
| 4 | OrganizationProvider + تعديل الـ hooks | 3-5 رسائل |
| 5 | نظام الخطط + لوحة Super Admin | 2-3 رسائل |
| 6 | حدود الاستخدام + تحسينات | 1-2 رسائل |

**الإجمالي المتوقع: 13-21 رسالة لإكمال التحويل الكامل.**

---

## تحذيرات مهمة

1. **البيانات الحالية**: البيانات الموجودة في بيئة Live ستحتاج لربطها بمؤسسة افتراضية (Vogatchi) عند التحويل
2. **التحويل تدريجي**: النظام سيعمل بشكل طبيعي أثناء التحويل - لن ينقطع
3. **الحجم كبير**: هذا أكبر تغيير ممكن في النظام، لذلك سنحتاج صبر ومتابعة مرحلة بمرحلة

---

## القسم التقني

### هيكل قاعدة البيانات الجديد
```text
organizations (جديد)
  |
  +-- organization_members (جديد) -- ربط المستخدمين
  |
  +-- subscription_plans (جديد) -- خطط الأسعار
  |
  +-- subscriptions (جديد) -- اشتراكات المؤسسات
  |
  +-- customers (+ organization_id)
  +-- hotel_bookings (+ organization_id)
  +-- flight_bookings (+ organization_id)
  +-- car_rentals (+ organization_id)
  +-- invoices (+ organization_id)
  +-- employees (+ organization_id)
  +-- suppliers (+ organization_id)
  +-- expense_transactions (+ organization_id)
  +-- bank_accounts (+ organization_id)
  +-- ... (باقي الـ 65+ جدول)
```

### Security Definer Function للـ RLS
```text
get_user_org_ids(user_id) -> UUID[]
  -- ترجع كل الـ organization_ids التي ينتمي لها المستخدم
  -- تُستخدم في كل سياسات RLS
```

### ملفات React الجديدة
```text
src/contexts/OrganizationContext.tsx     -- Provider للمؤسسة
src/hooks/useOrganization.tsx           -- Hook للوصول للمؤسسة
src/pages/SaaSLanding.tsx               -- صفحة هبوط تسويقية
src/pages/RegisterOrganization.tsx      -- تسجيل مؤسسة جديدة
src/pages/Onboarding.tsx               -- إعداد أولي
src/pages/admin/PlatformAdmin.tsx       -- لوحة إدارة المنصة
src/pages/SubscriptionExpired.tsx       -- صفحة انتهاء الاشتراك
src/components/org/OrgSwitcher.tsx      -- مبدل المؤسسات
```
