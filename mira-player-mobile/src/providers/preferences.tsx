import { getLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

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
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'en' ? 'en' : 'es';
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedTheme, storedLanguage] = await Promise.all([
        getPreference(PREF_THEME_MODE),
        getPreference(PREF_UI_LANGUAGE),
      ]);
      if (!active) return;
      if (isThemeMode(storedTheme)) setThemeModeState(storedTheme);
      setLanguageState(storedLanguage === 'en' || storedLanguage === 'es' ? storedLanguage : detectLanguage());
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<PreferencesValue>(() => {
    const colorScheme: 'light' | 'dark' =
      themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
    return {
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
    };
  }, [ready, themeMode, language, systemScheme]);

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
