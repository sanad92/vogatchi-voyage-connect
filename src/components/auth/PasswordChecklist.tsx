import { Check, Circle } from 'lucide-react';
import { getPasswordChecks } from '@/lib/passwordRules';

interface PasswordChecklistProps {
  id: string;
  password: string;
  requireMixedCharacters?: boolean;
  error?: string;
}

export default function PasswordChecklist({
  id,
  password,
  requireMixedCharacters = false,
  error,
}: PasswordChecklistProps) {
  const checks = getPasswordChecks(password);
  const characterRules = [
    { label: 'حرف إنجليزي كبير (A–Z)', met: checks.uppercase },
    { label: 'حرف إنجليزي صغير (a–z)', met: checks.lowercase },
    { label: 'رقم (0–9)', met: checks.number },
  ];
  const required = [
    { label: '٨ أحرف على الأقل', met: checks.length },
    ...(requireMixedCharacters ? characterRules : []),
  ];
  const recommended = [
    { label: '١٢ حرفًا أو أكثر', met: checks.longer },
    ...(!requireMixedCharacters ? characterRules : []),
    { label: 'رمز مثل ! أو #', met: checks.symbol },
  ];

  return (
    <div id={id} className="space-y-2 rounded-md border border-border px-3 py-2 text-xs">
      {[
        { title: 'شروط كلمة المرور', rules: required },
        { title: 'اقتراحات لكلمة مرور أقوى', rules: recommended },
      ].map(({ title, rules }) => (
        <div key={title} className="space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <ul className="space-y-1 sm:grid sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1 sm:space-y-0">
            {rules.map(({ label, met }) => (
              <li key={label} className={`flex items-center gap-1.5 ${met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                {met ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <Circle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                <span>
                  <span className="sr-only">{met ? 'متحقق. ' : 'غير متحقق. '}</span>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-muted-foreground">يتم التحقق من كلمات المرور الضعيفة الشائعة عند الإرسال.</p>
      )}
    </div>
  );
}
