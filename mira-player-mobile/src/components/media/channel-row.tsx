import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useNowNext } from '@/hooks/data/use-epg';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';
import type { Contenido } from '@/types/models';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ChannelRowBase({ channel, onPress }: { channel: Contenido; onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  const { data: epg } = useNowNext(channel.stream_id);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {channel.poster_url ? (
          <Image source={{ uri: channel.poster_url }} style={styles.icon} contentFit="contain" />
        ) : (
          <Ionicons name="tv-outline" size={20} color={theme.textSecondary} />
        )}
      </View>
      <View style={styles.info}>
        <ThemedText type="small" numberOfLines={1} style={styles.name}>
          {channel.nombre}
        </ThemedText>
        {epg?.now ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {epg.now.startTimestamp ? `${formatTime(epg.now.startTimestamp)} · ` : ''}{epg.now.title}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {t('channel.noGuide')}
          </ThemedText>
        )}
        {epg?.next ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.next}>
            {t('channel.next', { title: epg.next.title })}
          </ThemedText>
        ) : null}
      </View>
      <Ionicons name="play-circle" size={26} color={theme.accent} />
    </Pressable>
  );
}

export const ChannelRow = memo(ChannelRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  icon: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: Fonts.semibold },
  next: { opacity: 0.8 },
});
