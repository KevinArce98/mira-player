import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentRail, type RailItem } from '@/components/media/content-rail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Empty } from '@/components/ui/empty';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RatingPrompt } from '@/components/ui/rating-modal';
import { ScreenTitle } from '@/components/ui/screen-title';
import { Spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/data/use-account';
import { useContinueWatching, useRemoveContinueWatching } from '@/hooks/data/use-continue-watching';
import { useFavorites } from '@/hooks/data/use-favorites';
import { useAutoSync } from '@/hooks/data/use-sync';
import { useTheme } from '@/hooks/use-theme';
import type { TranslationKey } from '@/lib/i18n';
import { openContent, playContent } from '@/lib/navigation';
import { useT } from '@/providers/preferences';
import type { SyncStage } from '@/services/sync';

const SYNC_STAGES: Record<SyncStage, { labelKey: TranslationKey; fraction: number }> = {
  live: { labelKey: 'sync.live', fraction: 0.25 },
  movies: { labelKey: 'sync.movies', fraction: 0.55 },
  series: { labelKey: 'sync.series', fraction: 0.85 },
  done: { labelKey: 'sync.done', fraction: 1 },
};

export default function HomeScreen() {
  const theme = useTheme();
  const t = useT();
  const { data: account } = useAccount();
  const accountId = account?.id;

  const sync = useAutoSync();
  const continueWatching = useContinueWatching(accountId);
  const removeContinue = useRemoveContinueWatching();
  const favorites = useFavorites(accountId);

  const confirmRemoveContinue = (progresoId: string, title: string) => {
    Alert.alert(t('continueWatching.removeTitle'), t('continueWatching.removeMessage', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => removeContinue.mutate(progresoId),
      },
    ]);
  };

  const continueItems: RailItem[] = (continueWatching.data ?? []).map(({ progreso, contenido, episodio }) => {
    const fraction =
      progreso.duracion_total && progreso.duracion_total > 0
        ? progreso.posicion_segundos / progreso.duracion_total
        : 0;
    const isEpisode = episodio != null;
    return {
      key: progreso.id,
      title: contenido.nombre,
      subtitle: isEpisode ? `T${episodio!.temporada} · E${episodio!.episodio}` : (contenido.categoria ?? null),
      posterUrl: episodio?.poster_url ?? contenido.poster_url,
      progress: fraction,
      onPress: () => playContent(contenido.id, episodio?.id),
      onLongPress: () => confirmRemoveContinue(progreso.id, contenido.nombre),
    };
  });

  const favoriteItems: RailItem[] = (favorites.data ?? []).map((c) => ({
    key: c.id,
    title: c.nombre,
    subtitle: c.categoria,
    posterUrl: c.poster_url,
    onPress: () => openContent(c),
  }));

  const empty = continueItems.length === 0 && favoriteItems.length === 0;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScreenTitle
          title={t('home.title')}
          right={
            <View style={styles.actions}>
              <Pressable
                onPress={() => account && sync.mutate(account)}
                disabled={sync.isPending}
                hitSlop={8}>
                <Ionicons
                  name={sync.isPending ? 'sync' : 'refresh'}
                  size={22}
                  color={sync.isPending ? theme.textSecondary : theme.text}
                />
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                <Ionicons name="settings-outline" size={22} color={theme.text} />
              </Pressable>
            </View>
          }
        />

        {sync.isPending ? (
          <View style={styles.syncBanner}>
            <View style={styles.syncRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('home.syncing', { stage: t(SYNC_STAGES[sync.progress?.stage ?? 'live'].labelKey) })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {sync.progress?.written ?? 0}
              </ThemedText>
            </View>
            <ProgressBar value={SYNC_STAGES[sync.progress?.stage ?? 'live'].fraction} />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={sync.isPending}
              onRefresh={() => account && sync.mutate(account)}
              tintColor={theme.accent}
            />
          }>
          {empty ? (
            <Empty
              icon="play-circle-outline"
              title={t('home.empty.title')}
              subtitle={t('home.empty.subtitle')}
            />
          ) : (
            <>
              {continueItems.length > 0 ? <ContentRail title={t('home.continueWatching')} items={continueItems} /> : null}
              {favoriteItems.length > 0 ? <ContentRail title={t('home.favorites')} items={favoriteItems} /> : null}
            </>
          )}
        </ScrollView>

        <RatingPrompt />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  syncBanner: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.one },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { paddingVertical: Spacing.three, gap: Spacing.four, flexGrow: 1 },
});
