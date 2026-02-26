

# خطة: فصل صفحة تسجيل الدخول عن صفحة إنشاء الحساب

## الوضع الحالي
حالياً يوجد صفحة واحدة `/auth` تحتوي على tabs (تسجيل دخول + إنشاء حساب) داخل مكون `SupabaseAuthForm`.

## التغييرات المطلوبة

### 1. إنشاء صفحة تسجيل الدخول `/login`
- ملف جديد: `src/pages/LoginPage.tsx`
- تحتوي على نموذج تسجيل الدخول فقط (بريد إلكتروني + كلمة مرور)
- رابط "نسيت كلمة المرور؟"
- رابط "ليس لديك حساب؟ أنشئ حساب" يوجه لـ `/signup`
- تصميم نظيف مع شعار Vogatchi

### 2. إنشاء صفحة إنشاء حساب `/signup`
- ملف جديد: `src/pages/SignupPage.tsx`
- تحتوي على نموذج التسجيل (الاسم + البريد + كلمة المرور)
- رابط "لديك حساب؟ سجل دخول" يوجه لـ `/login`
- نفس التصميم المتسق

### 3. تحديث التوجيه في `App.tsx`
- إضافة route `/login` و `/signup`
- توجيه `/auth` إلى `/login` (للتوافقية)
- تحديث الـ redirect في `AuthPage.tsx` و `SupabaseProtectedRoute.tsx` ليوجه لـ `/login` بدل `/auth`

### 4. تحديث الروابط في المكونات الأخرى
- `SupabaseProtectedRoute.tsx`: تغيير redirect من `/auth` إلى `/login`
- `AuthPage.tsx`: تحديث المنطق أو استبداله
- أي مكونات أخرى تشير لـ `/auth`

## الملفات المتأثرة
- **جديد**: `src/pages/LoginPage.tsx`، `src/pages/SignupPage.tsx`
- **تعديل**: `src/App.tsx`، `src/components/SupabaseProtectedRoute.tsx`

## تفاصيل تقنية
- كلا الصفحتين تستخدمان `useOptimizedAuth` hook الموجود للـ `signIn` و `signUp`
- نفس منطق التوجيه: إذا المستخدم مسجل دخول يتم توجيهه للداشبورد
- التصميم يستخدم `AuthLayout` الموجود كـ wrapper

