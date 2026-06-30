import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getPreference,
  PREF_THEME_MODE,
  PREF_UI_LANGUAGE,
  setPreference,
} from '@/db/repositories/preferences';
import type { Language, TranslationKey } from '@/lib/i18n';
import { translate } from '@/lib/i18n';

export type ThemeMode = 'system' | 'light' | 'dark';
type Vars = Record<string, string | number>;

interface PreferencesValue {
  ready: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  colorScheme: 'light' | 'dark';
  t: (key: TranslationKey, vars?: Vars) => string;
}

export const PreferencesContext = createContext<PreferencesValue | null>(null);

function detectLanguage(): Language {
  const code = navigator.language?.split('-')[0]?.toLowerCase();
  return code === 'en' ? 'en' : 'es';
}

function systemColorScheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<Language>('es');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(systemColorScheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [storedTheme, storedLanguage] = await Promise.all([
        getPreference(PREF_THEME_MODE),
        getPreference(PREF_UI_LANGUAGE),
      ]);
      if (!active) return;
      if (isThemeMode(storedTheme)) setThemeModeState(storedTheme);
      setLanguageState(
        storedLanguage === 'en' || storedLanguage === 'es' ? storedLanguage : detectLanguage(),
      );
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const colorScheme: 'light' | 'dark' =
    themeMode === 'system' ? systemScheme : themeMode;

  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorScheme]);

  const value = useMemo<PreferencesValue>(
    () => ({
      ready,
      themeMode,
      language,
      colorScheme,
      setThemeMode: (mode) => {
        setThemeModeState(mode);
        void setPreference(PREF_THEME_MODE, mode);
      },
      setLanguage: (next) => {
        setLanguageState(next);
        void setPreference(PREF_UI_LANGUAGE, next);
      },
      t: (key, vars) => translate(language, key, vars),
    }),
    [ready, themeMode, language, colorScheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

export function useT() {
  return usePreferences().t;
}
