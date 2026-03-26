

# مراجعة المعادلات — النتائج

---

## المعادلات الصحيحة ✅

### 1. حساب ليالي الفندق (`calculationHelpers.ts`)
- `numberOfNights = (checkOut - checkIn) / millisecondsPerDay` — صحيح، يستخدم `Math.ceil`
- `totalCost = sellingPricePerNight × numberOfNights` — صحيح
- `totalProfit = totalCost - (costPerNight × numberOfNights)` — صحيح
- `profitMargin = (totalProfit / totalCost) × 100` — صحيح

### 2. حساب الطيران (`calculationHelpers.ts`)
- `totalCost = (ticketPricePerPerson × numberOfPassengers) + taxesAndFees` — صحيح
- `totalProfit = totalCost - supplierCost` — صحيح

### 3. حساب الفاتورة (`useAutoCalculations.tsx`)
- `discountedAmount = subtotal - discountAmount` — صحيح
- `vatAmount = discountedAmount × (vatRate / 100)` — صحيح (VAT على المبلغ بعد الخصم)
- `finalAmount = discountedAmount + vatAmount` — صحيح

### 4. حساب تأجير السيارات (`CarRentalForm.tsx`)
- `totalRentalCost = dailyRate × rentalDurationDays` — صحيح
- `supplierTotalCost = supplierDailyCost × rentalDurationDays` — صحيح
- `totalProfit = totalRentalCost - supplierTotalCost` — صحيح

### 5. حساب الراتب (`SalaryCalculation.tsx`)
- `netSalary = grossSalary - deductions - taxAmount - insuranceDeduction` — صحيح

### 6. حساب الأرباح والخسائر (`useProfitLossCalculations.tsx`)
- `grossProfit = totalRevenue - directCosts` — صحيح
- `netProfit = grossProfit - indirectCosts` — صحيح
- `profitMargin = (netProfit / totalRevenue) × 100` — صحيح

### 7. حساب العمولة (`calculationHelpers.ts`)
- نسبة مئوية: `amount × (rate / 100)` — صحيح
- مبلغ ثابت: يرجع المبلغ مباشرة — صحيح

### 8. الضريبة والخصم — صحيح

---

## المشاكل المكتشفة ⚠️

### مشكلة 1: تناقض في حساب الليالي بين ملفين
**الملف:** `src/hooks/useBookingCalculations.ts` (سطر 18-19)

```typescript
// يستخدم Math.max بدون Math.ceil — ممكن يطلع رقم عشري
const numberOfNights = Math.max(0, 
  new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()
) / (1000 * 60 * 60 * 24);
```

بينما `calculationHelpers.ts` يستخدم `Math.ceil` — الصحيح. هذا الملف القديم ممكن يطلع `0.9583` بدل `1` بسبب فروق التوقيت (DST).

**الإصلاح:** استخدام `Math.ceil` مثل `calculationHelpers.ts`، أو الأفضل استخدام `calculateNights` مباشرة.

---

### مشكلة 2: حساب الطيران لا يشمل الضرائب في نموذج واحد
**الملف:** `src/components/flight-bookings/hooks/useFlightBookingForm.tsx` (سطر 81-82)

```typescript
const totalCost = ticketPrice * numberOfPassengers;
// ❌ لا يضيف taxes_and_fees!
```

بينما `calculationHelpers.ts` يحسبها صح:
```typescript
const totalCost = (ticketPricePerPerson * numberOfPassengers) + taxesAndFees;
```

**التأثير:** الحجوزات المُنشأة من هذا النموذج تُحفظ بـ `total_cost` أقل من الحقيقي، وبالتالي `total_profit` أعلى من الحقيقي.

---

### مشكلة 3: حساب ربح تأجير السيارات غير متسق
**الملف:** `src/hooks/useEnhancedCarRentalForm.tsx` (سطر 229) يحسب الربح هكذا:
```typescript
total_profit: totalRentalCost - supplierTotalCost - insurance_cost - additional_fees
```

بينما `CarRentalForm.tsx` (سطر 87) يحسبه:
```typescript
total_profit: totalRentalCost - supplierTotalCost
// ❌ لا يخصم التأمين والرسوم الإضافية
```

**التأثير:** نموذجين مختلفين يحسبون الربح بطريقتين مختلفتين.

---

### مشكلة 4: الأرباح والخسائر لا تشمل النقل وتأجير السيارات
**الملف:** `src/hooks/useProfitLossCalculations.tsx`

التقرير يحسب الإيرادات من الفنادق والطيران فقط، ولا يشمل:
- حجوزات النقل (`transport_bookings.total_cost`)
- تأجير السيارات (`car_rentals.total_rental_cost`)

**التأثير:** تقرير الأرباح والخسائر ناقص — لا يعكس الإيرادات الفعلية الكاملة.

---

### مشكلة 5: `remaining_amount` ممكن يكون سالب
**عدة ملفات** — مثلاً `useFlightBookingForm.tsx` سطر 107:
```typescript
remaining_amount: totalCost - (data.paid_amount || 0)
// ❌ لو paid_amount أكبر من totalCost، المبلغ المتبقي يبقى سالب
```

بينما `calculationHelpers.ts` يستخدم `Math.max(0, ...)` — الصحيح. لكن الاستخدام الفعلي في النماذج لا يستخدم هذه الدالة.

---

### مشكلة 6: Expenses غير مفلترة بالعملة بشكل كامل
**الملف:** `useProfitLossCalculations.tsx` سطر 85

المصروفات مفلترة بـ `currency = 'EGP'` فقط. المصروفات بعملات أخرى (USD, SAR) يتم تجاهلها تماماً من التقرير.

---

## ملخص الإصلاحات المطلوبة

```text
┌──────┬──────────────────────────────────────────────────┬──────────┐
│ رقم  │ المشكلة                                          │ الأثر    │
├──────┼──────────────────────────────────────────────────┼──────────┤
│  1   │ useBookingCalculations لا يستخدم Math.ceil       │ منخفض   │
│  2   │ نموذج الطيران لا يضيف الضرائب للـ totalCost     │ عالي 🔴 │
│  3   │ ربح السيارات غير متسق بين النموذجين              │ متوسط   │
│  4   │ تقرير P&L لا يشمل النقل وتأجير السيارات         │ عالي 🔴 │
│  5   │ remaining_amount ممكن يكون سالب                  │ منخفض   │
│  6   │ المصروفات بعملات غير EGP غير محسوبة              │ متوسط   │
└──────┴──────────────────────────────────────────────────┴──────────┘
```

## خطة الإصلاح

### الملفات المطلوب تعديلها:

1. **`src/hooks/useBookingCalculations.ts`** — استخدام `Math.ceil` بدل القسمة المباشرة
2. **`src/components/flight-bookings/hooks/useFlightBookingForm.tsx`** — إضافة `taxes_and_fees` لحساب `totalCost`
3. **`src/components/transport/CarRentalForm.tsx`** — خصم التأمين والرسوم من الربح
4. **`src/hooks/useProfitLossCalculations.tsx`** — إضافة إيرادات وتكاليف النقل وتأجير السيارات + تحويل المصروفات بالعملات الأخرى
5. **`src/hooks/useEnhancedFlightForm.tsx`** + **`src/components/transport/CarRentalForm.tsx`** — استخدام `Math.max(0, ...)` للمبلغ المتبقي

