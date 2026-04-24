# فحص عميق لنظام Vogatchi مقابل دفترة

## 1. خريطة الموديولات الموجودة (67 صفحة + 95 جدول)

### A. CRM وإدارة العملاء (مكتمل 90%)
| الموديول | الجداول | الوظيفة | مقارنة بدفترة |
|----------|---------|----------|---------------|
| العملاء | `customers`, `customer_notes`, `customer_communications`, `customer_follow_ups`, `customer_satisfaction` | إدارة كاملة للعملاء + متابعات + تقييم رضا | ✅ أقوى من دفترة (دفترة CRM أساسي) |
| تكرار العملاء | `get_duplicate_customers()` | كشف العملاء المكررين | ✅ مميزة فريدة |
| البوابة | `CustomerPortalPage` | بوابة العميل الذاتية | ✅ متوفرة |
| الولاء | `loyalty_points`, `loyalty_rewards` | نقاط ومكافآت | ⚠️ غير مفعّلة في الـ UI |
| التسويق | `marketing_campaigns`, `campaign_sends`, `customer_segments` | حملات تسويقية | ⚠️ بدون UI كامل |

### B. الحجوزات (مكتمل 95% — أقوى نقطة)
| الموديول | الجداول | الوظيفة |
|----------|---------|----------|
| فنادق | `hotel_bookings`, `hotels`, `hotel_suppliers` | حجز فنادق متعدد العملات |
| طيران | `flight_bookings`, `airlines`, `airports`, `flight_classes` | تذاكر طيران + درجات |
| نقل | `transport_bookings`, `transport_routes` | باصات/رحلات برية |
| تأجير سيارات | `car_rentals`, `vehicle_types` | تأجير مركبات |
| موحّد | `bookings`, `booking_*_details` | نموذج موحد جديد (Phase migration) |
| تقويم | `BookingsCalendar` | عرض تقويمي |
| طلبات الحجز | `booking_request` (public) | نموذج عام للحجز |

### C. المبيعات والمالية (مكتمل 85%)
| الموديول | الجداول | الوظيفة |
|----------|---------|----------|
| عروض الأسعار | `quotes`, `quote_items`, `useQuoteConversion` | عروض → فواتير |
| الفواتير | `invoices`, `invoice_items`, `invoice_payments` | فواتير + دفعات جزئية |
| طلبات الدفع | `payment_transactions`, Paymob integration | بوابة دفع إلكتروني |
| الحسابات البنكية | `bank_accounts`, `bank_account_transactions` | إدارة بنوك + تحديث رصيد تلقائي |
| التحويلات | `bank_transfer_requests` | تحويلات بنكية للاشتراكات |
| المصروفات | `expense_transactions`, `expense_categories` | مصروفات متعددة العملات |
| الإيجارات | `rent_contracts`, `rent_payments` | عقود إيجار شهرية |

### D. المحاسبة الجديدة (Phase 1 — مكتمل 60%)
| الموديول | الحالة |
|----------|---------|
| شجرة الحسابات | ✅ 26 حساب افتراضي (4000-6900) |
| القيود اليومية | ✅ تلقائية للفواتير + المصروفات |
| ميزان المراجعة | ✅ RPC جاهزة |
| قائمة الدخل | ✅ RPC جاهزة |
| الميزانية العمومية | ❌ مفقودة |
| التدفقات النقدية | ❌ مفقودة |
| القيود اليدوية | ❌ بدون UI للإنشاء |
| إقفال السنة | ❌ مفقود |

### E. الموارد البشرية (مكتمل 80%)
| الموديول | الجداول |
|----------|---------|
| الموظفين | `employees`, `profiles`, linked via `linked_employee_id` |
| الرواتب | `monthly_salaries`, salary settings |
| العمولات | `employee_commissions`, `employee_commission_periods`, `commission_payments` |
| الحضور | `useAttendance` (جزئي) |
| الصلاحيات | RBAC متقدم: owner/admin/manager/employee + permissions templates |

### F. الموردين (ضعيف — فجوة كبيرة 40%)
| الموجود | الناقص |
|---------|---------|
| `suppliers`, `supplier_contracts`, `supplier_payments`, `supplier_ratings`, `supplier_currencies` | عقود تفصيلية، أسعار موسمية، Allotments/Blocks، أرصدة مستحقة منفصلة |

### G. الاتصالات (مكتمل 90%)
- WhatsApp Business API كامل (`whatsapp_*` 6 جداول)
- Email queue + Resend + Templates
- Notifications + bell
- Automation Engine (`automation_rules`, `automation_actions`, `automation_logs`) — event-driven

### H. CMS وSite Customization
- `pages`, `blocks`, `content_blocks`, `forms`, `form_fields`, `form_submissions`, `media_library`
- محرر صفحات هبوط ديناميكي

### I. Platform Admin (SaaS Layer)
- `subscriptions`, `subscription_plans`, `platform_roles`
- خطط (Free/Pro/Enterprise) + Trial 14 يوم تلقائي
- Grace period قابل للتخصيص
- لوحة تحكم منصّة (organizations, transfers, settings)

### J. الأمان والمراقبة
- `admin_audit_log` (immutable + trigger تلقائي)
- `error_logs`, `api_logs`, `performance_logs`, `backup_logs`
- Multi-tenancy عبر `organization_id` + RLS شامل

---

## 2. الأخطاء والمشاكل المكتشفة (12 مشكلة أمنية + بنيوية)

### 🔴 خطيرة (Critical)
1. **Storage Bucket مفتوح**: bucket `documents` يسمح لأي مستخدم authenticated بقراءة/حذف ملفات أي مؤسسة. يجب فلترة حسب `organization_id` في path.

### 🟠 عالية (High)
2. **email_queue INSERT مفتوح**: سياسة `WITH CHECK (true)` تسمح لأي مستخدم بحقن إيميلات لأي مستلم.
3. **whatsapp_templates بدون عزل**: أي مستخدم authenticated يقرأ/يعدّل قوالب أي مؤسسة (لا يوجد `organization_id` على الجدول).
4. **Realtime channels مفتوحة**: أي مستخدم يشترك في قنوات `bookings` و `notifications` لمؤسسات أخرى.
5. **organization_members INSERT منطق خاطئ**: `WHERE organization_id = organization_id` (tautology) — يسمح بإدخالات غير مصرّح بها.

### 🟡 متوسطة (Warnings)
6. **4 RLS policies بـ `USING (true)`** على UPDATE/DELETE/INSERT.
7. **Leaked Password Protection معطّلة** في Supabase Auth.
8. **`whatsapp_settings` بدون organization_id** — credentials مشتركة عالمياً.
9. **`can_org_write()` لا يتحقق من عضوية المستخدم** في المؤسسة (defense in depth).

### 🔵 بنيوية / تقنية
10. **ازدواجية في الحجوزات**: `hotel_bookings` + `bookings`+`booking_hotel_details` يعملان بالتوازي (migration نصفي).
11. **حسابات الأرباح مزدوجة**: `useProfitLossCalculations` يحسب يدوياً + محرك المحاسبة الجديد — قد يعطي أرقام مختلفة.
12. **القيود لا تشمل العمليات القديمة**: triggers تشتغل فقط للسجلات الجديدة.

---

## 3. مقارنة مرجعية بـ دفترة

| الميزة | دفترة | Vogatchi الحالي | الفجوة |
|--------|-------|------------------|---------|
| المحاسبة المزدوجة التلقائية | ✅ كاملة | ⚠️ جزئية (فاتورة + مصروف فقط) | تحتاج: مدفوعات، رواتب، تكاليف حجوزات |
| شجرة حسابات قابلة للتخصيص | ✅ | ✅ | OK |
| ميزان مراجعة | ✅ | ✅ | OK |
| قائمة الدخل | ✅ | ✅ | OK |
| الميزانية العمومية | ✅ | ❌ | يجب إضافتها |
| قائمة التدفقات النقدية | ✅ | ❌ | يجب إضافتها |
| قيود يدوية + مرفقات | ✅ | ⚠️ بدون UI | إنشاء واجهة |
| إقفال الفترات المحاسبية | ✅ | ❌ | مفقود |
| ضرائب QR/ZATCA | ✅ سعودي | ⚠️ حقول فقط | تطبيق فعلي |
| تعدد العملات + revaluation | ✅ | ⚠️ exchange_rates فقط بدون revaluation | تحتاج فروقات صرف |
| تقارير العمر للذمم (Aging) | ✅ | ❌ | مفقود |
| إدارة المخزون | ✅ عام | ❌ غير مطلوب (سياحة) | لا يلزم |
| **التخصص السياحي** | ❌ عام | ✅ قوي جداً | **ميزتنا التنافسية** |
| إدارة موردين/Allotments | ❌ ضعيف | ⚠️ أساسي | يجب تطويره |
| ربط مباشر بفنادق وطيران | ❌ | ✅ | ميزة تنافسية |
| WhatsApp Automation | ❌ | ✅ متقدم | ميزة تنافسية |
| CRM + Loyalty + Marketing | ❌ ضعيف | ✅ | ميزة تنافسية |

---

## 4. خارطة الطريق المقترحة (4 مراحل)

### المرحلة 1 — إصلاحات أمنية عاجلة (1-2 يوم)
- إصلاح Storage policies على bucket `documents` (فلترة حسب org path)
- إصلاح RLS على `email_queue`, `whatsapp_templates`, `organization_members`
- تفعيل Leaked Password Protection
- إضافة `organization_id` إلى `whatsapp_templates` + `whatsapp_settings`
- تأمين Realtime channels حسب org
- مراجعة `can_org_write` و دمج فحص العضوية

### المرحلة 2 — استكمال محرك المحاسبة (3-5 أيام)
- Triggers للمدفوعات (`invoice_payments`) → قيد: نقدية / ذمم عملاء
- Triggers للرواتب (`monthly_salaries`) → قيد: مصروف رواتب / نقدية
- Triggers لتكاليف الحجوزات (cost vs revenue) → قيد: تكلفة مبيعات / ذمم موردين
- Triggers لمدفوعات الموردين → قيد: ذمم موردين / نقدية
- صفحة الميزانية العمومية + التدفقات النقدية
- صفحة إنشاء قيود يدوية مع تحقق التوازن
- تقرير Aging للذمم المدينة والدائنة
- ترحيل العمليات القديمة (script for one-time backfill)

### المرحلة 3 — تطوير الموردين (2-3 أيام)
- جداول `supplier_rates` (موسمي/markup)، `supplier_allocations` (blocks)
- ربط كل حجز بـ supplier_rate لحساب التكلفة الدقيقة
- صفحة عقود الموردين + أرصدة مستحقة
- تقرير ربح كل حجز (Net profit per booking)

### المرحلة 4 — ميزات دفترة المتقدمة (3-4 أيام)
- ZATCA QR للفواتير السعودية (Phase 1 + Phase 2)
- إقفال الفترات المحاسبية (lock entries)
- فروقات أسعار الصرف الدورية (revaluation)
- مركز تكلفة (Cost Centers) للأقسام/الفروع
- موازنات تقديرية (Budgets) ومقارنة فعلي/مخطط
- تقارير KPI سياحي: ADR، RevPAR، GOP%، نسبة الإلغاء

---

## 5. توصية للأولوية

أنصح بشدة نبدأ **المرحلة 1 (الأمن) فوراً** قبل أي تطوير، لأن مشاكل الـ Storage و Realtime تعرّض بيانات العملاء عبر المؤسسات. بعدها المرحلة 2 (إكمال المحاسبة) لأنها الفجوة الجوهرية بينك وبين دفترة.

**اختر من فضلك:**
1. ابدأ بالمرحلة 1 فقط (إصلاحات أمنية) ثم نراجع
2. ابدأ بالمرحلة 2 (استكمال المحاسبة) — الأكثر قيمة وظيفية
3. نفّذ المرحلتين 1 + 2 في رحلة واحدة
4. ركّز على ميزة محددة (ZATCA / Aging / موردين)
