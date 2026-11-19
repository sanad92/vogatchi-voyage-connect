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

### إصدار Android داخلي موقّع

احتفظ بملف توقيع الشركة وكلمة مروره في مخزن الأسرار الخاص بالشركة. استخدم نفس المفتاح ومعرّف `com.safarerp.mobile` لكل الإصدارات، وزد `versionCode` مع كل نشر. ينشئ اختبار GitHub مفتاحًا مؤقتًا مستقلًا للتحقق من الترقية على المحاكي.

بعد `npm ci`، وفّر مسار المفتاح واسم الشهادة وكلمة المرور عبر متغيرات البيئة `SAFAR_ANDROID_KEYSTORE` و`SAFAR_ANDROID_KEY_ALIAS` و`SAFAR_ANDROID_KEYSTORE_PASSWORD`. استخدم `SAFAR_ANDROID_KEY_PASSWORD` عند اختلاف كلمة مرور المفتاح. ابنِ الملف من مجلد `mobile`:

~~~sh
bash scripts/android-release.sh 3 /absolute/output/SafarERP-Android.apk
~~~

عند التوزيع، ارفع ملف APK على مضيف HTTPS الخاص بالفريق وانشر بيانات الإصدار بعد اكتمال رفعه. اضبط `VITE_ANDROID_UPDATE_MANIFEST_URL` وقت البناء على رابط ملف JSON الذي يستطيع التطبيق قراءته. يفتح زر التحديث رابط APK على نفس المضيف عند وجود إصدار أحدث.

~~~json
{
  "applicationId": "com.safarerp.mobile",
  "versionCode": 4,
  "apkUrl": "./SafarERP-Android-4.apk"
}
~~~

### إشعار إسناد مهمة على Android

1. سجّل `com.safarerp.mobile` في مشروع Firebase الخاص بالشركة وضع `google-services.json` في `mobile/android/app/` عند بناء APK. فعّل الإشعارات من «حسابي» بعد تسجيل الدخول على الجهاز.
2. طبّق ترحيل `mobile_booking_task_push` وانشر Edge Function باسم `mobile-task-push` في بيئة الاختبار. اضبط `SAFAR_FIREBASE_SERVICE_ACCOUNT` في أسرار الدالة بهوية مسموح لها بإرسال FCM، و`SAFAR_MOBILE_PUSH_WORKER_SECRET` بقيمة عشوائية لا تقل عن 32 حرفًا.
3. احفظ عنوان الدالة الكامل في Supabase Vault باسم `safar_mobile_push_worker_url` ونفس سر استدعاء الدالة باسم `safar_mobile_push_worker_secret`. عندما تتوفر إضافات `pg_cron` و`pg_net` وVault، يفحص المجدول الطابور كل دقيقة. إذا كنت تستخدم مجدولًا آخر، أرسل `POST` إلى الدالة بترويسة `Authorization: Bearer <SAFAR_MOBILE_PUSH_WORKER_SECRET>`. راقب عدادات `sent` و`retrying` و`dropped`.
4. أسند في بيئة الاختبار مهمة حجز لموظف له صلاحية الاطلاع والجهاز في الخلفية. تحقق من ظهور إشعار عام وفتح المهمة للحساب المخصص لها. اختبر أيضًا إعادة الإسناد والخروج من الجهاز.

### iOS

على macOS مع Xcode 26 أو أحدث، شغّل:

```sh
npm run ios:open
```

معرّف التطبيق على المنصتين `com.safarerp.mobile`. اختَر فريق التوقيع الخاص بالشركة في Xcode لبناء نسخة جهاز أو TestFlight. يمكن تفعيل بناء المحاكي من سير عمل Mobile build في GitHub Actions.
