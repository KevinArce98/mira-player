import { FlatList, StyleSheet, View } from 'react-native';

import { PosterCard } from '@/components/media/poster-card';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';

export interface RailItem {
  key: string;
  title: string;
  posterUrl?: string | null;
  subtitle?: string | null;
  progress?: number;
  onPress?: () => void;
}

export function ContentRail({
  title,
  items,
  cardWidth = 130,
  aspectRatio = 2 / 3,
}: {
  title: string;
  items: RailItem[];
  cardWidth?: number;
  aspectRatio?: number;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="small" style={styles.heading}>
        {title}
      </ThemedText>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(it) => it.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PosterCard
            title={item.title}
            posterUrl={item.posterUrl}
            subtitle={item.subtitle}
            progress={item.progress}
            aspectRatio={aspectRatio}
            width={cardWidth}
            onPress={item.onPress}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  heading: { fontFamily: Fonts.display, fontSize: 18, paddingHorizontal: Spacing.three, letterSpacing: -0.2 },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.three },
});
