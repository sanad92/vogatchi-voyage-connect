## السبب
المسار `/` بيعرض `src/pages/SaaSLanding.tsx` (مش `LandingPage.tsx` اللي عدّلناه قبل كده). الصفحة دي لسه فيها لوجو يدوي قديم: مربع أزرق فيه حرف **H** + كلمة Vogantra نص — في 3 مواضع.

## التغييرات

**ملف واحد فقط:** `src/pages/SaaSLanding.tsx`

1. **Import**: إضافة `import VogantraLogo from '@/components/brand/VogantraLogo';`

2. **Header (Desktop)** — استبدال المربع + النص بـ:
   ```tsx
   <Link to="/" aria-label="Vogantra"><VogantraLogo size="md" /></Link>
   ```

3. **Mobile Menu (Sheet)** — استبدال نفس البلوك بـ `<VogantraLogo size="sm" />`.

4. **Footer** — استبدال نفس البلوك بـ `<VogantraLogo size="sm" />`.

## النتيجة
صفحة الهبوط (`/`) هتعرض اللوجو الرسمي اللي رفعته بدل الـ "H" placeholder — في الهيدر، المنيو الموبايل، والفوتر.

## ملاحظة
كل الصفحات التانية (login, signup, dashboard, footer التاني...) متركّبة سليم بالفعل من الـ rebrand السابق، فمحتاج تعديل صفحة واحدة بس.
