import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ProgressBar({ value, height = 3 }: { value: number; height?: number }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
