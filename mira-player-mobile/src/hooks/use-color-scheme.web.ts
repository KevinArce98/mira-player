import { useContext, useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { PreferencesContext } from '@/providers/preferences';

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

function getSnapshot() {
  return true;
}

export function useColorScheme(): 'light' | 'dark' {
  const hasHydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefs = useContext(PreferencesContext);
  const system = useRNColorScheme();
  if (!hasHydrated) return 'light';
  if (prefs) return prefs.colorScheme;
  return system === 'dark' ? 'dark' : 'light';
}
