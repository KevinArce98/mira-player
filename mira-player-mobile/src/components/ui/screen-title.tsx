import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function ScreenTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: { flexShrink: 1 },
});
