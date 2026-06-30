import { usePreferences } from '@/providers/preferences';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const { colorScheme } = usePreferences();
  return Colors[colorScheme];
}
