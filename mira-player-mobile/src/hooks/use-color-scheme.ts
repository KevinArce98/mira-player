import { useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { PreferencesContext } from '@/providers/preferences';

export function useColorScheme(): 'light' | 'dark' {
  const prefs = useContext(PreferencesContext);
  const system = useSystemColorScheme();
  if (prefs) return prefs.colorScheme;
  return system === 'dark' ? 'dark' : 'light';
}
