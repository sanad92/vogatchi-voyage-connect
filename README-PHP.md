# نظام Vogatchi CRM - PHP Backend

## إعداد قاعدة البيانات

### 1. إنشاء قاعدة البيانات
```sql
CREATE DATABASE vogatchi_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. استيراد الجداول
```bash
mysql -u username -p vogatchi_crm < database/mysql/schema.sql
```

### 3. إنشاء المستخدم الإداري الأول
```bash
php api/auth/seed-admin.php
```

## إعداد الاتصال

### 1. إعداد قاعدة البيانات
- نسخ ملف `config/database.php` وتعديل بيانات الاتصال
- أو إنشاء ملف `config/database.local.php` للإعدادات المحلية

### 2. إعدادات Apache/Nginx
تأكد من تفعيل:
- PHP Sessions
- MySQL Extension
- JSON Extension
- mod_rewrite (Apache)

### 3. CORS Headers
الـ API يدعم CORS بشكل افتراضي للتطوير

## هيكل المشروع

```
api/
├── _bootstrap.php          # إعدادات عامة وأدوات مساعدة
├── auth/
│   ├── login.php          # تسجيل الدخول
│   ├── logout.php         # تسجيل الخروج
│   ├── me.php             # بيانات المستخدم الحالي
│   └── seed-admin.php     # إنشاء مستخدم إداري
├── customers/
│   ├── list.php           # قائمة العملاء
│   ├── create.php         # إضافة عميل جديد
│   ├── update.php         # تحديث عميل
│   └── delete.php         # حذف عميل
├── bookings/
│   └── hotel/
│       └── create.php     # إنشاء حجز فندق
└── invoices/
    └── create.php         # إنشاء فاتورة

config/
└── database.php           # إعدادات قاعدة البيانات

database/
└── mysql/
    └── schema.sql         # هيكل قاعدة البيانات
```

## بيانات تسجيل الدخول الافتراضية

```
البريد الإلكتروني: admin@vogatchitrips.com
كلمة المرور: admin123
الدور: super_admin
```

## API Endpoints

### المصادقة
- `POST /api/auth/login.php` - تسجيل الدخول
- `POST /api/auth/logout.php` - تسجيل الخروج  
- `GET /api/auth/me.php` - بيانات المستخدم الحالي

### العملاء
- `GET /api/customers/list.php` - قائمة العملاء
- `POST /api/customers/create.php` - إضافة عميل
- `POST /api/customers/update.php` - تحديث عميل
- `DELETE /api/customers/delete.php` - حذف عميل

### الحجوزات
- `POST /api/bookings/hotel/create.php` - حجز فندق

### الفواتير
- `POST /api/invoices/create.php` - إنشاء فاتورة

## الأمان

- تشفير كلمات المرور باستخدام `password_hash()`
- Sessions لإدارة المصادقة
- فلترة المدخلات وحماية من SQL Injection
- CORS Headers للحماية من CSRF

## المحاسبة 📊

يحتوي النظام الآن على محرك مسك دفاتر مزدوجة (double entry) يدعم المكونات التالية:

- جدول `chart_of_accounts` لدليل الحسابات مع أنواع (أصول، خصوم، حقوق، إيرادات، مصروفات).
- جداول `journal_entries` و`journal_lines` لتأريخ القيود اليومية.
- جدول اختياري `salary_payments` لتسجيل الرواتب.
- خدمة `AccountingService` توفر:
  * إدخال قيود مزدوجة متوازنة
  * استخراج ميزان المراجعة (`trialBalance`)
  * حساب بيان الأرباح والخسائر `profitAndLoss(start,end)`
  * إنشاء الميزانية العمومية `balanceSheet(asOf)`
- الربط التلقائي عبر خدمات الأعمال:
  * إنشاء القيود الأولى عند إصدار فاتورة
  * تسجيل قيود الدفع عند تحصيل مبلغ من فاتورة
  * إنشاء قيد عند اعتماد مصاريف
  * تسجيل قيد راتب عند دفع الرواتب (من خلال `SalaryService`)

**ملاحظة:** يجب إعداد حسابات (مع رموز مثل `1000` نقد/بنك، `1100` عملاء، `4000` إيرادات، `5000` مصروفات، إلخ) قبل الاستفادة من القيود.

### مبدئية التشغيل

1. استيراد التعديلات الأخيرة إلى الهيكل:
   ```bash
   mysql -u user -p vogatchi_crm < database/mysql/schema.sql
   # أو تشغيل السكريبتات في migrations/ بعد ضبط الأذونات
   ```
2. إنشاء الحسابات المطلوبة باستخدام واجهة الإدارة أو من خلال `AccountingService::addAccount()`.
3. عند إنشاء فاتورة عبر API أو لوحة التحكم سيتم تسجيل قيود استحقاقية.
4. تحديث المبالغ المدفوعة على الفاتورة يقوم بترحيل قيد الدفع.
5. اعتماد المصاريف عبر `ExpenseTransaction::approve()` يُولّد قيدًا تلقائيًا.
6. دفع راتب عبر `SalaryService::recordPayment(...)` يعبِّئ جدول الرواتب ويرحل القيد.

### أمثلة برمجية

```php
$svc = new AccountingService();
$svc->postEntry('2025-05-01', 'قيد تجريبي', [
    ['account_code'=>'1000','debit'=>100],
    ['account_code'=>'4000','credit'=>100]
]);

$tb = $svc->trialBalance();
$pl = $svc->profitAndLoss('2025-01-01','2025-12-31');
```

## التطوير

للتطوير المحلي:
1. تشغيل خادم PHP المحلي: `php -S localhost:8000`
2. تأكد من تشغيل MySQL
3. استيراد قاعدة البيانات
4. إنشاء المستخدم الإداري

للإنتاج:
1. رفع الملفات لخادم cPanel
2. إنشاء قاعدة البيانات من cPanel
3. تحديث إعدادات الاتصال
4. تشغيل seed-admin.php