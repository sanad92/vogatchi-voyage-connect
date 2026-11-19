# Safar ERP Mobile

واجهة موبايل مبنية بـReact وVite وتشارك منطق الجلسة وتسميات الحالات وأنواع البيانات مع مشروع الويب. يستخدم Capacitor لبناء Android وiOS، وحسابات Safar ERP الحالية وصلاحيات المؤسسة من Supabase. يعرض التطبيق نظرة عامة والبحث عن الحجوزات والعملاء وتفاصيلهم، ويدعم تعديل اسم العميل وهاتفه وبريده لمن يملك صلاحية تعديل العملاء في المؤسسة النشطة. إنشاء العملاء وإدارة الحجوزات وباقي الموديولات متاحة من الويب.

## التشغيل والبناء

من مجلد `mobile`:

```sh
npm ci
npm run start
npm run check
npm run native:sync
```

يقرأ البناء رابط Supabase والمفتاح العام من إعدادات المشروع الحالي. لبناء النسخة على بيئة أخرى، استخدم `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY`. لا يقبل الإعداد مفتاح `service_role`. الجلسة تحفظ في الذاكرة وتطلب تسجيل الدخول عند بدء تشغيل جديد. ويعمل مؤقت عدم النشاط المشترك مع الويب أثناء فتح التطبيق.

### Android

ثبّت Java 21 وAndroid SDK 36. اضبط `ANDROID_HOME` أو ضع مسار SDK في `android/local.properties` ثم شغّل:

```sh
npm run android:debug
```

النتيجة `android/app/build/outputs/apk/debug/app-debug.apk`. تحتاج نسخة المتجر توقيع الإصدار من حساب الشركة.

### iOS

على macOS مع Xcode 26 أو أحدث، شغّل:

```sh
npm run ios:open
```

معرّف التطبيق على المنصتين `com.safarerp.mobile`. اختَر فريق التوقيع الخاص بالشركة في Xcode لبناء نسخة جهاز أو TestFlight. يمكن تفعيل بناء المحاكي من سير عمل Mobile build في GitHub Actions.
