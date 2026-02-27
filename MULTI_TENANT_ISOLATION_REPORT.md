# تقرير فرض عزل متعدد المستأجرين (Multi-Tenant Isolation)

**التاريخ**: 2026-02-27  
**الحالة**: تحليل شامل + التنفيذ

---

## 1. الجداول الناقصة organization_id

### الجداول الحرجة (بدون organization_id حالياً):

| الجدول | الأهمية | الإجراء المقترح |
|--------|--------|-----------------|
| **users** | حرج | إضافة organization_id (مع دعم المستخدمين عبر المنظمات) |
| **customers** | حرج | إضافة organization_id + FK |
| **suppliers** | حرج | إضافة organization_id + FK |
| **hotel_bookings** | حرج | إضافة organization_id + FK |
| **flight_bookings** | حرج | إضافة organization_id + FK |
| **car_rentals** | حرج | إضافة organization_id + FK |
| **invoices** | حرج | إضافة organization_id + FK |
| **employees** | حرج | إضافة organization_id + FK |
| **expense_transactions** | حرج | إضافة organization_id + FK |
| **whatsapp_conversations** | عالي | إضافة organization_id + FK |
| **whatsapp_messages** | عالي | يرث من المحادثة |
| **service_requests** | متوسط | إضافة organization_id + FK |
| **booking_statuses** | عالي | إضافة organization_id (أو جعله عام) |
| **bank_accounts** | عالي | إضافة organization_id + FK |
| **exchange_rates** | متوسط | قد يكون عام - يحتاج مراجعة |
| **site_settings** | عالي | إضافة organization_id (تخصيص حسب المنظمة) |
| **landing_content** | متوسط | إضافة organization_id (تخصيص المحتوى) |

---

## 2. آليات العزل المقترحة

### أ. مستوى قاعدة البيانات
- ✅ إضافة `organization_id` كحقل في كل جدول
- ✅ Foreign Key constraint links to `organizations` table
- ✅ Unique indexes على (organization_id, some_field)
- ✅ Default exclusion في WHERE clauses للاستعلامات

### ب. مستوى التطبيق (PHP Classes)
- ✅ Base middleware class للفلترة التلقائية
- ✅ Automatic tenant scope enforcement في جميع الاستعلامات
- ✅ Validation checks قبل إرجاع البيانات

### ج. مستوى API
- ✅ التحقق من organization_id من الـ session
- ✅ Validation أن المستخدم الحالي ينتمي للـ organization

---

## 3. خادم البيانات الحالي

### قاعدة البيانات الأساسية (MySQL):
- **الملف**: `database.sql` و `database/mysql/schema.sql`
- **الجداول الموجودة**: 15+ جدول
- **الحالة**: بدون عزل متعدد المستأجرين

### قاعدة البيانات الثانوية (Supabase/PostgreSQL):
- **الملف**: `supabase/migrations/`
- **الحالة**: يحتوي على `organizations` و `organization_members` tables
- **ملحوظة**: يُستخدم للمصادقة والاشتراك فقط

### المشكلة:
الفصل بين النظام يؤدي إلى **ثغرة أمنية كبيرة** - البيانات في MySQL لا تُفلتر حسب organization_id!

---

## 4. خطة التنفيذ

### المرحلة 1: تعديل قاعدة البيانات ✅
- تحديث `schema.sql` بإضافة `organization_id` لجميع الجداول
- إنشاء foreign keys صحيحة
- إضافة indexes على `organization_id`)

### المرحلة 2: Middleware Layer ✅
- إنشاء `TenantMiddleware.php` base class
- توفير methods للفلترة التلقائية

### المرحلة 3: تحديث PHP Classes ✅
- تعديل `Database.php` لدعم tenant filtering
- تحديث جميع operation classes (Customer, HotelBooking, etc.)

### المرحلة 4: Validation & Auth ✅
- إضافة checks في `Auth.php`
- إنشاء `TenantValidator.php` class

---

## 5. تفاصيل التنفيذ

### 5.1 تخطيط الهجرة
```sql
-- المرحلة الأولى: إضافة الحقل
ALTER TABLE customers ADD COLUMN organization_id CHAR(36) NULL;

-- المرحلة الثانية: ملء البيانات الموجودة
-- (لكل جدول حسب الحالة الحالية)

-- المرحلة الثالثة: جعل الحقل مطلوب + FK
ALTER TABLE customers 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_customers_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE;
```

### 5.2 Middleware Pattern
```php
class Database extends TenantMiddleware {
  public function selectByOrg($sql, $params = [], $orgId) {
    $sql = $this->injectOrgFilter($sql);
    $params['organization_id'] = $orgId;
    return $this->query($sql, $params);
  }
}
```

### 5.3 مثال الاستخدام
```php
$customer = new Customer();
$customer->setTenantId($userOrgId);
$customers = $customer->getAll(); // مفلترة تلقائياً

// أو
$customers = $customer->getByOrganization($userOrgId, $page);
```

---

## 6. Validation Rules

### للمستخدمين:
```
✓ user@email.com يمكنه فقط الوصول إلى data من organizations التي ينتمي إليها
✓ حتى لو حاول manipulate organization_id في الطلب سيتم الرفض
✓ super_admin يمكنه الوصول إلى جميع المنظمات (مع logging)
```

### للبيانات:
```
✓ كل إنشاء record يجب أن يحتوي على organization_id
✓ لا يمكن نقل record بين organizations
✓ عند حذف organization يتم حذف جميع البيانات المرتبطة (CASCADE)
```

---

## 7. مخاطر أمنية معالجة

| المخاطر | الحل |
|--------|------|
| تسرب بيانات عبر SQL Injection | استخدام Prepared Statements + Tenant Filter |
| Cross-org data access | Automatic WHERE clause injection |
| Privilege Escalation | Role + Org validation في كل operation |
| Mass assignment vulnerability | Whitelist only known fields in $allowedFields |
| Missing filters على الرابطة (relations) | التحقق من organization في JOINs |

---

## 8. ملفات التنفيذ

### الملفات الجديدة:
- ✅ `classes/TenantMiddleware.php` - Base middleware class
- ✅ `classes/TenantValidator.php` - Validation logic
- ✅ `database/migrations/add_organization_id.sql` - Migration script

### الملفات المعدلة:
- ✅ `database/mysql/schema.sql` - إضافة organization_id
- ✅ `classes/Database.php` - دعم tenant filtering
- ✅ `classes/Customer.php` - تحديث queries
- ✅ `classes/Auth.php` - تحديث validation
- وغيرها...

---

## 9. اختبار الأمان

### Test Cases:
```php
// Test 1: المستخدم لا يمكنه الوصول إلى بيانات منظمة أخرى
$userOrgId = 'org-1';
$otherOrgId = 'org-2';
$result = $customer->get($customerId); // org-2
assert($result === null); // يجب أن يكون فارغ

// Test 2: حتى مع manipulating organization_id مباشرة
$sql = "SELECT * FROM customers WHERE id = ? AND organization_id = ?";
// يجب أن يفشل لأن الـ middleware يفرض الـ tenant

// Test 3: super_admin يمكنه الوصول مع logging
$admin = new Auth();
$admin->login('admin@vogatchitrips.com', 'password');
$result = $admin->getAcrossOrgs($query); // logged
```

---

## 10. Timeline التنفيذ

**المرحلة 1** (الآن):
- ✅ تحديث schema.sql
- ✅ إنشاء TenantMiddleware
- ✅ تحديث Database class

**المرحلة 2** (التالية):
- تحديث جميع operation classes
- إضافة validation layer
- اختبار شامل

**المرحلة 3** (اختياري):
- Migration script للبيانات الموجودة
- Monitoring و logging

---

## ملاحظات مهمة

1. **Organizations Table**: يجب أن يكون موجود في MySQL أيضاً أو الربط مع Supabase
2. **Super Admin Access**: يحتاج logging شامل لأي cross-org access
3. **Performance**: إضافة indexes على (organization_id, other_key) 
4. **Testing**: اختبارات أمان صارمة قبل الإنتاج
