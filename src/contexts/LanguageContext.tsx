import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EN_DICTIONARY } from '@/i18n/en';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'safar:ui-language:v1';

interface LanguageContextValue {
  language: AppLanguage;
  dir: 'rtl' | 'ltr';
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  /** Translate an Arabic source string; falls back to the Arabic text when no English entry exists. */
  t: (arabic: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const readInitial = (): AppLanguage => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(readInitial);
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* ignore */ }
  }, [language, dir]);

  const setLanguage = useCallback((lang: AppLanguage) => setLanguageState(lang), []);
  const toggleLanguage = useCallback(() => setLanguageState((l) => (l === 'ar' ? 'en' : 'ar')), []);
  const t = useCallback(
    (arabic: string) => (language === 'en' ? EN_DICTIONARY[arabic] ?? arabic : arabic),
    [language],
  );

  const value = useMemo(() => ({ language, dir, setLanguage, toggleLanguage, t }), [language, dir, setLanguage, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return { language: 'ar', dir: 'rtl', setLanguage: () => {}, toggleLanguage: () => {}, t: (s) => s };
  }
  return ctx;
};
