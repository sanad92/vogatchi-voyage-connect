
# المرحلة الثانية — Unified Booking Workspace

هدف المرحلة: بناء الواجهة الكاملة `/bookings/:id/workspace` فوق `useBookingWorkspace` من المرحلة الأولى، مع الحفاظ على الصفحة القديمة `/bookings/:id` تعمل كما هي.

## المخرجات

- مسار جديد: `/bookings/:id/workspace` (Lazy route محمي بـ `bookings_view`).
- زر "مساحة العمل" (Workspace) في صفحة `UnifiedBookingDetails` وفي جدول `/bookings` لكل صف، بدون حذف أي رابط قديم.
- تجربة صفحة واحدة بتبويبات، RTL، Premium/Minimal، تعمل على الموبايل.

## هيكل الشاشة

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: رقم الحجز • نوع الحجز • Badge حالة • أزرار سريعة    │
│  (WhatsApp • فاتورة • تسجيل دفعة • فاوتشر • تحديث)           │
├──────────────────────────────────────────────────────────────┤
│ Stage Stepper: lead → qualified → quoted → confirmed →       │
│                paid → operations → traveling → completed →   │
│                post_travel     (زر تغيير المرحلة)            │
├──────────────────────────────────────────────────────────────┤
│ Summary Row: العميل • المورد • تواريخ السفر • الربح/الهامش   │
├───────────┬──────────────────────────────────────────────────┤
│  Tabs     │  Content                                         │
│  Overview │  Itinerary │ Financials │ Documents │ WhatsApp │
│           │  Notes & Tasks │ Timeline                        │
└──────────────────────────────────────────────────────────────┘
```

## التبويبات

- **Overview**: بطاقة العميل، Stage Stepper، ملخص الربح، أقرب مهمة مفتوحة، آخر رسالة واتساب، اختصارات (Create Invoice, Record Payment, Send WhatsApp Template).
- **Itinerary**: بطاقات Hotel / Flight / Transport / Car حسب المتاح من `itinerary`، مع Empty state واضح لكل نوع وزر "إضافة تفاصيل" يفتح صفحات الإدخال الحالية.
- **Financials**: يستخدم `BookingFinancialWorkspace` و `BookingAccountingPanel` الموجودين + جدول `payments` من الـ hook + شريط "المستحق / المدفوع / الرصيد".
- **Documents**: عرض المرفقات الحالية من `booking` + رابط للفواتير + استخدام `useDocuments`؛ لا رفع جديد في هذه المرحلة (سيأتي في المرحلة 7).
- **WhatsApp**: لوحة مضمّنة تعرض آخر محادثة (`conversation` من الـ hook) + `WindowStatusBadge` + زر "فتح المحادثة الكاملة" ينقل إلى `/whatsapp-admin?conversation=…`. إذا لا يوجد محادثة، زر "بدء محادثة" يفتح Composer بالقالب الافتراضي.
- **Notes & Tasks**:
  - قائمة `tasks` بحالات (open/in_progress/done) مع Priority + Due، أزرار إغلاق/إضافة (يستخدم `addTask`, `completeTask`).
  - قائمة `customer_notes` للعميل مع نموذج إضافة ملاحظة (Reuse `useConversationNotes` أو استعلام مباشر لجدول `customer_notes` بنفس الـ hook).
- **Timeline**: عرض عمودي عكسي لـ `timeline` (Kind → أيقونة، Summary، وقت نسبي بالعربية)، مع فلترة سريعة (كل، مراحل، مهام، مالي، واتساب).

## المكونات الجديدة

- `src/pages/BookingWorkspace.tsx` — الصفحة نفسها + Tabs (shadcn Tabs)، تستخدم `useBookingWorkspace(id)`.
- `src/components/bookings/workspace/WorkspaceHeader.tsx` — Header + Quick Actions.
- `src/components/bookings/workspace/StageStepper.tsx` — Stepper مع مؤشر تقدم و`Popover` لتغيير المرحلة (يستدعي `setStage` ويسجّل `logEvent`).
- `src/components/bookings/workspace/OverviewTab.tsx`.
- `src/components/bookings/workspace/ItineraryTab.tsx`.
- `src/components/bookings/workspace/FinancialsTab.tsx` (يغلف الموجود).
- `src/components/bookings/workspace/DocumentsTab.tsx`.
- `src/components/bookings/workspace/WhatsAppTab.tsx`.
- `src/components/bookings/workspace/TasksTab.tsx`.
- `src/components/bookings/workspace/TimelineTab.tsx`.

كل مكوّن يستقبل مخرجات الـ hook عبر props (Presentational)، مما يبقي الاختبار سهلاً ويمنع تكرار الاستعلامات.

## التعديلات على ملفات موجودة

- `src/App.tsx`: إضافة `const BookingWorkspace = lazy(...)` و`<Route path="/bookings/:id/workspace" ...>`.
- `src/pages/UnifiedBookingDetails.tsx`: زر "فتح مساحة العمل" في الهيدر يذهب إلى `/:id/workspace`.
- `src/pages/UnifiedBookings.tsx` (جدول الحجوزات): إضافة أيقونة زر Workspace بجانب زر التفاصيل. (بدون إزالة زر التفاصيل).

## القرارات الفنية

- التبويب يُدار عبر `?tab=overview|itinerary|...` في الـ URL (deep-link + مشاركة).
- الوقت النسبي بالعربية عبر `date-fns/locale/ar-SA`.
- ألوان الحالة تستخدم tokens من `index.css` (`--primary`, `--success`, `--muted-foreground`) — لا ألوان صريحة.
- كل الاستعلامات مسبوقة بـ `useOrgId` عبر `useBookingWorkspace` (موجود أصلاً — RLS).
- Realtime يعمل تلقائياً (الـ hook فيه اشتراك على `booking_tasks`, `booking_timeline_events`, `bookings`).
- لا تعديلات schema في هذه المرحلة. لا Edge functions جديدة.

## التحقق قبل الإغلاق

1. Build/typecheck ينجحان.
2. Playwright: فتح `/bookings/<id>/workspace` بعد استرجاع الجلسة، والتقاط لقطات لكل تبويب (7 لقطات)، والتأكد من عدم وجود أخطاء Console.
3. تجربة تغيير المرحلة → يظهر سطر جديد في تبويب Timeline (اختبار realtime).
4. إضافة مهمة → تظهر فوراً في Tasks و Timeline.

## خارج نطاق هذه المرحلة

- رفع مستندات جديدة (يأتي في المرحلة 7).
- Action Bar داخل الواتساب من داخل المحادثة (المرحلة 3).
- AI Concierge و Quote Builder (المرحلة 4).
- Automation والتذكيرات (المرحلة 5).

هل أبدأ التنفيذ بهذا الشكل، أم تفضّل تعديل ترتيب/محتوى التبويبات قبل البدء؟
