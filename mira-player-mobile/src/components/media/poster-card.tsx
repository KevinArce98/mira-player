import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PosterCardProps {
  title: string;
  posterUrl?: string | null;
  subtitle?: string | null;
  progress?: number;
  aspectRatio?: number;
  width: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function PosterCard({
  title,
  posterUrl,
  subtitle,
  progress,
  aspectRatio = 2 / 3,
  width,
  onPress,
  onLongPress,
}: PosterCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
      <View
        style={[
          styles.posterWrap,
          { aspectRatio, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
          </View>
        )}
        {progress != null && progress > 0 ? (
          <View style={styles.progressOverlay}>
            <ProgressBar value={progress} />
          </View>
        ) : null}
      </View>
      <ThemedText type="small" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  posterWrap: {
    width: '100%',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  poster: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressOverlay: { position: 'absolute', left: Spacing.one, right: Spacing.one, bottom: Spacing.one },
  title: { marginTop: Spacing.one, fontFamily: Fonts.semibold },
});
