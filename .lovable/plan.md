

## المشكلة والحل

### 1. خطأ TypeScript في `RegisterOrganization.tsx`
الكود يستدعي `supabase.rpc('create_organization_onboarding')` لكن هذه الدالة غير مُعرّفة في أنواع TypeScript. الحل: الاعتماد فقط على edge function `create-organization-onboarding` وإزالة الـ RPC fallback، أو استخدام `as any` للتخطي.

### 2. أخطاء Build في Edge Functions (11 خطأ)
- **`getClaims` غير موجودة**: في `confirm-payment` و `create-payment-intent` — استبدالها بـ `auth.getUser()`
- **`error` من نوع `unknown`**: في 7 ملفات edge functions — إضافة `(error as Error).message` أو `(error as any).message`

### 3. إضافة زر "تخطي" في صفحة إنشاء المؤسسة
- إضافة زر أسفل الـ form يسمح بالدخول مباشرة للوحة التحكم
- تعديل `SupabaseProtectedRoute.tsx` ليسمح بالدخول بدون مؤسسة عند التخطي (عبر localStorage flag)

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/RegisterOrganization.tsx` | إزالة RPC fallback، إضافة زر تخطي |
| `src/components/SupabaseProtectedRoute.tsx` | السماح بالتخطي عبر flag |
| `supabase/functions/confirm-payment/index.ts` | استبدال `getClaims` بـ `getUser`، تصحيح نوع error |
| `supabase/functions/create-payment-intent/index.ts` | نفس التصحيح |
| `supabase/functions/create-payment/index.ts` | تصحيح نوع error |
| `supabase/functions/generate-demo-data/index.ts` | تصحيح نوع error |
| `supabase/functions/paymob-webhook/index.ts` | تصحيح نوع error |
| `supabase/functions/send-booking-confirmation/index.ts` | تصحيح نوع error |
| `supabase/functions/send-whatsapp-message/index.ts` | تصحيح نوع error |

## تفاصيل تقنية

**زر التخطي**: عند الضغط يحفظ `localStorage.setItem('org_setup_skipped', 'true')` ثم ينقل لـ `/dashboard`. في `SupabaseProtectedRoute` نتحقق من هذا الـ flag قبل التوجيه لصفحة إنشاء المؤسسة.

**استبدال `getClaims`**:
```typescript
// قبل
const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
const userId = claimsData.claims.sub;

// بعد  
const { data: { user }, error: userError } = await authClient.auth.getUser();
const userId = user.id;
```

**تصحيح نوع error**: كل `catch (error)` يصبح `catch (error: unknown)` مع `(error as Error).message`.

