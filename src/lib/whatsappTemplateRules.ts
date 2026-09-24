/** Meta template text rules: no leading/trailing variable, no adjacent variables. */
const VAR = /\{\{\s*[^}]+\s*\}\}/;

export const templateTextIssues = (text: string): string[] => {
  const t = (text || '').trim();
  if (!t) return [];
  const issues: string[] = [];
  if (new RegExp('^' + VAR.source).test(t)) issues.push('النص يبدأ بمتغير');
  if (new RegExp(VAR.source + '$').test(t)) issues.push('النص ينتهي بمتغير');
  if (/\}\}\s*\{\{/.test(t)) issues.push('يوجد متغيران متتاليان بدون نص بينهما');
  return issues;
};

export const fixTemplateText = (text: string, locale: 'ar' | 'en' = 'ar'): string => {
  let t = (text || '').trim();
  if (!t) return t;
  t = t.replace(/\}\}(\s*)\{\{/g, '}} - {{');
  if (new RegExp('^' + VAR.source).test(t)) t = (locale === 'ar' ? 'مرحباً ' : 'Hello ') + t;
  if (new RegExp(VAR.source + '$').test(t)) t = t + '.';
  return t;
};
