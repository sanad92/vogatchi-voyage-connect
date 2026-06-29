# فحص شامل للسيستم — التقرير والخطة

## أولاً: نتائج الفحص (موثّقة بأرقام من قاعدة البيانات)

### 1. مشاكل بيانات (Data Integrity)
| المؤشر | العدد | الأثر |
|---|---|---|
| حجوزات بدون عميل (`customer_id IS NULL`) | 3 | لا تظهر في صفحة العميل ولا تُحتسب في loyalty |
| حجوزات بسعر صفر/فارغ | 10 | فواتير صفرية + قيود محاسبية مشوّهة |
| حجوزات بدون مورّد | 7 | لا يتم توليد سداد مورّد |
| حجوزات بدون تواريخ start/end | 17 | تكسر التقارير الزمنية والـ calendar |
| حجوزات بـ profit سالب | 17 | يدل على cost > price (خطأ إدخال) |
| حجوزات بدون قيد محاسبي | 6 | فجوة في الإيرادات |
| `hotel_bookings` مش متربطة بالـ unified `bookings` | 5 | غير ظاهرة في صفحة `/bookings` ولا في `/data-quality` |

### 2. محاسبة
- 353 قيد محاسبي، **كلهم متوازنين** (debit = credit) ✅
- 171 فاتورة، **عملتها مطابقة للحجز** ✅ (الـ trigger يعمل صح)
- 169 سداد مورد ✅

### 3. أمان قاعدة البيانات (Linter)
174 تحذير — كلها WARN (لا توجد ERRORS):
- **165 تحذير** على دوال `SECURITY DEFINER` قابلة للاستدعاء من anon/authenticated بدون داعي
- **3 سياسات RLS** بـ `USING (true)` على عمليات UPDATE/DELETE/INSERT (خطر تصعيد صلاحيات)
- **1 إضافة** في الـ public schema
- **5 دوال** بدون `search_path` ثابت

### 4. مشاكل واجهة (Frontend) معروفة من السياق
- توست تحذيري متكرر "Missing Description for DialogContent" (a11y)
- `useMultiCurrency` ما زال مستخدماً رغم أنه deprecated
- بعض الـ stats cards تعرض EGP افتراضي حتى لو الحجز بعملة أخرى (مغطى جزئياً)

### 5. تكامل الموديولات
- صفحة `/bookings` ما تعرضش 5 حجوزات فندق legacy
- لا يوجد ربط مرئي بين `quotes` و `bookings` المُحوَّلة منها
- لا توجد آلية لكشف العميل المكرر تلقائياً عند إدخال حجز جديد

---

## ثانياً: خطة الإصلاح (5 مراحل، كل مرحلة قابلة للإيقاف والمراجعة)

### Phase 1 — تنظيف البيانات (Migration واحد)
1. Backfill للـ 5 `hotel_bookings` الناقصة إلى جدول `bookings` الموحّد.
2. Backfill قيود محاسبية لـ 6 حجوزات بدون journal entry (تتم تخطّي صف cost/price = 0).
3. علم `data_quality_status` على الحجوزات بـ `profit < 0` كـ "review_needed" (لا أعدّل الأرقام أوتوماتيكياً).
4. SQL function `validate_booking_before_invoice` يمنع إصدار فاتورة لحجز بسعر = 0 أو بدون عميل.

### Phase 2 — تحصين الأمان (Migration)
1. تعديل 3 سياسات RLS الـ `USING (true)` لتستخدم `has_role()` أو `organization_id = get_current_org()`.
2. لكل دالة `SECURITY DEFINER`:
   - إضافة `SET search_path = public, pg_temp` (للـ 5 الناقصين).
   - `REVOKE EXECUTE ... FROM anon` للدوال غير المعنية بـ public (مثل `calculate_monthly_salary`, `reconcile_bookings_for_org`...).
   - تبقى متاحة لـ `authenticated` فقط حيث يلزم.
3. نقل أي extension من `public` إلى `extensions` schema (لو ممكن بدون كسر).

### Phase 3 — لوحة الجودة (Data Quality) موسّعة
1. توسيع RPC `get_incomplete_records` لتشمل: حجوزات بـ profit سالب، بدون عميل، بدون تواريخ، legacy غير مُهاجَر.
2. إضافة tabs في `/data-quality`: "ناقصة الأسعار" | "ناقصة الموردين" | "ناقصة العملاء" | "ربح سالب" | "غير مُهاجَرة".
3. زر "إصلاح سريع" لكل صف يفتح dialog يحرر الحقل الناقص مباشرة.
4. badge أحمر في الـ sidebar بعدد السجلات الناقصة.

### Phase 4 — تكامل الموديولات
1. عند إنشاء حجز جديد: lookup تلقائي للعميل بـ "أول كلمتين من الاسم" + suggest existing بدل إنشاء duplicate.
2. ربط `quotes` ↔ `bookings`: لما الـ quote يتحول، يظهر badge "Converted to BK-xxx" مع زر للذهاب.
3. توحيد الـ booking_status_history: تأكيد إن كل تغيير حالة بيكتب row (التحقق برمجياً).
4. لوحة "Booking 360°" تجمع: الحجز + الفاتورة + سداد المورد + القيد + الاتصالات + المستندات في tab واحد.

### Phase 5 — تنظيف الواجهة
1. حذف استخدامات `useMultiCurrency` المتبقية واستبدالها بـ `useCurrencyHelper`.
2. إضافة `DialogDescription` (أو `aria-describedby={undefined}` صراحةً) لكل dialog ينقصه (~12 dialog).
3. توحيد الـ EmptyState/LoadingState/ErrorState في الصفحات الـ 8 المتبقية.
4. إزالة الـ console.log الزائد في الـ production build.

---

## تفاصيل تقنية
- كل migrations idempotent ومقسومة لملفات حسب المرحلة.
- لن أُعدّل أي رقم مالي تلقائياً (السعر/التكلفة/الربح) — فقط أضع flags للمراجعة اليدوية.
- لن ألمس جداول `auth/storage/realtime`.
- الـ Phase 2 (الأمان) قد تكسر بعض النداءات من الـ client لو دالة كانت تُستدعى من anon بدون قصد — أحتاج تأكيدك قبل تطبيقها.

---

## أسئلة قبل البدء
1. **هل تريد التنفيذ كله؟** أم نبدأ بـ Phase 1 (البيانات) و Phase 3 (لوحة الجودة) فقط لأنها الأكثر إلحاحاً؟
2. **الـ 17 حجز بربح سالب**: أحذفهم؟ أم أحتفظ بهم مع flag للمراجعة؟ (الافتراضي: flag فقط)
3. **الـ Phase 5 (a11y + cleanup)** قد تستغرق وقتاً ولا تأثير وظيفي مباشر — هل أؤجلها؟
