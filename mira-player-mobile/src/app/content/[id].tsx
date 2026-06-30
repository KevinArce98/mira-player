import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Loading } from '@/components/ui/empty';
import { Fonts, Spacing } from '@/constants/theme';
import {
  useContent,
  useContentDetails,
  useIsFavorite,
  useProgressFor,
  useSetCompleted,
} from '@/hooks/data/use-content';
import { useEpisodes, useSeriesProgress } from '@/hooks/data/use-episodes';
import { useToggleFavorite } from '@/hooks/data/use-favorites';
import { useTheme } from '@/hooks/use-theme';
import { playContent } from '@/lib/navigation';
import { useT } from '@/providers/preferences';
import type { Episodio, Progreso } from '@/types/models';

export default function ContentDetailScreen() {
  const theme = useTheme();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: content, isLoading } = useContent(id);
  const fav = useIsFavorite(id);
  const toggleFav = useToggleFavorite();
  const setCompleted = useSetCompleted();
  const movieProgress = useProgressFor(content?.tipo === 'movie' ? id : undefined);
  const episodes = useEpisodes(content?.tipo === 'series' ? id : undefined);
  const seriesProgress = useSeriesProgress(content?.tipo === 'series' ? id : undefined);
  const details = useContentDetails(id, content?.tipo);

  if (isLoading || !content) {
    return (
      <ThemedView style={styles.root}>
        <Loading />
      </ThemedView>
    );
  }

  const resumeSecs = movieProgress.data?.posicion_segundos ?? 0;
  const total = movieProgress.data?.duracion_total ?? 0;
  const watched = movieProgress.data?.completado ?? false;
  const descripcion = details.data?.descripcion ?? content.descripcion;
  const reparto = details.data?.reparto ?? content.reparto;
  const genero = details.data?.genero ?? content.genero;
  const anio = details.data?.anio ?? content.anio;
  const duracionSecs = details.data?.duracion_secs ?? content.duracion_secs;
  const metaParts = [genero, anio, duracionSecs ? formatRuntime(duracionSecs) : null].filter(
    (x): x is string => !!x,
  );

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ title: content.nombre }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.poster, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {content.poster_url ? (
              <Image source={{ uri: content.poster_url }} style={styles.posterImg} contentFit="cover" />
            ) : (
              <Ionicons name="image-outline" size={32} color={theme.textSecondary} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="subtitle" numberOfLines={3}>
              {content.nombre}
            </ThemedText>
            {content.categoria ? (
              <ThemedText type="small" themeColor="textSecondary">
                {content.categoria}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {content.tipo === 'movie' ? (
            <Pressable
              onPress={() => playContent(content.id)}
              style={[styles.playBtn, { backgroundColor: theme.tint }]}>
              <Ionicons name="play" size={18} color={theme.onTint} />
              <ThemedText themeColor="onTint" style={styles.playText}>
                {resumeSecs > 0 ? t('detail.resume') : t('detail.play')}
              </ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => toggleFav.mutate(content.id)}
            style={[styles.iconBtn, { borderColor: theme.border }]}>
            <Ionicons
              name={fav.data ? 'heart' : 'heart-outline'}
              size={22}
              color={fav.data ? theme.danger : theme.text}
            />
          </Pressable>

          {content.tipo === 'movie' ? (
            <Pressable
              onPress={() => setCompleted.mutate({ contentId: content.id, completado: !watched })}
              style={[styles.iconBtn, { borderColor: watched ? theme.accent : theme.border }]}>
              <Ionicons
                name={watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={watched ? theme.accent : theme.text}
              />
            </Pressable>
          ) : null}
        </View>

        {content.tipo === 'movie' && resumeSecs > 0 && total > 0 ? (
          <View style={styles.resumeWrap}>
            <ProgressBar value={resumeSecs / total} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.progress', { current: formatSecs(resumeSecs), total: formatSecs(total) })}
            </ThemedText>
          </View>
        ) : null}

        {metaParts.length > 0 ? (
          <ThemedText type="small" style={styles.metaInfo}>
            {metaParts.join('  ·  ')}
          </ThemedText>
        ) : null}

        {descripcion ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.synopsis}>
            {descripcion}
          </ThemedText>
        ) : null}

        {reparto ? (
          <View style={styles.metaRow}>
            <ThemedText type="small" style={styles.metaLabel}>
              {t('detail.cast')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.metaValue}>
              {reparto}
            </ThemedText>
          </View>
        ) : null}

        {content.tipo === 'series' ? (
          <SeasonsList
            episodes={episodes.data ?? []}
            loading={episodes.isLoading}
            serieId={content.id}
            progress={seriesProgress.data ?? {}}
            onToggleWatched={(episodeId, completado) =>
              setCompleted.mutate({ contentId: content.id, completado, episodeId })
            }
          />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function SeasonsList({
  episodes,
  loading,
  serieId,
  progress,
  onToggleWatched,
}: {
  episodes: Episodio[];
  loading: boolean;
  serieId: string;
  progress: Record<string, Progreso>;
  onToggleWatched: (episodeId: string, completado: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT();
  if (loading) return <Loading />;
  if (episodes.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.noEpisodes}>
        {t('detail.noEpisodes')}
      </ThemedText>
    );
  }

  const bySeason = new Map<number, Episodio[]>();
  for (const ep of episodes) {
    const list = bySeason.get(ep.temporada) ?? [];
    list.push(ep);
    bySeason.set(ep.temporada, list);
  }

  return (
    <View style={styles.seasons}>
      {[...bySeason.entries()].map(([season, eps]) => (
        <Fragment key={season}>
          <ThemedText type="small" style={styles.seasonTitle}>
            {t('detail.season', { number: season })}
          </ThemedText>
          {eps.map((ep) => {
            const p = progress[ep.id];
            const epWatched = p?.completado ?? false;
            const totalSecs = p?.duracion_total ?? ep.duracion ?? 0;
            const fraction = !epWatched && p && totalSecs > 0 ? p.posicion_segundos / totalSecs : 0;
            return (
              <Pressable
                key={ep.id}
                onPress={() => playContent(serieId, ep.id)}
                style={({ pressed }) => [
                  styles.epRow,
                  { borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={[styles.epNum, epWatched && { color: theme.textSecondary }]}>
                  {ep.episodio}
                </ThemedText>
                <View style={styles.epBody}>
                  <ThemedText
                    type="small"
                    numberOfLines={1}
                    themeColor={epWatched ? 'textSecondary' : 'text'}>
                    {ep.titulo ?? t('detail.episode', { number: ep.episodio })}
                  </ThemedText>
                  {fraction > 0 ? (
                    <View style={styles.epProgress}>
                      <ProgressBar value={fraction} />
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => onToggleWatched(ep.id, !epWatched)}
                  hitSlop={8}
                  style={styles.epToggle}>
                  <Ionicons
                    name={epWatched ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={epWatched ? theme.accent : theme.textSecondary}
                  />
                </Pressable>
                <Ionicons name="play-circle-outline" size={22} color={theme.accent} />
              </Pressable>
            );
          })}
        </Fragment>
      ))}
    </View>
  );
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRuntime(secs: number): string {
  const totalMin = Math.round(secs / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', gap: Spacing.three },
  poster: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  posterImg: { width: '100%', height: '100%' },
  headerInfo: { flex: 1, gap: Spacing.one, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  playText: { fontFamily: Fonts.bold, fontSize: 16 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  resumeWrap: { gap: Spacing.one },
  metaInfo: { fontFamily: Fonts.semibold },
  synopsis: { lineHeight: 20 },
  metaRow: { gap: Spacing.half },
  metaLabel: { fontFamily: Fonts.semibold },
  metaValue: {},
  seasons: { gap: Spacing.one, marginTop: Spacing.two },
  seasonTitle: { fontFamily: Fonts.display, fontSize: 16, marginTop: Spacing.three, marginBottom: Spacing.one },
  noEpisodes: { marginTop: Spacing.three },
  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  epNum: { width: 24, textAlign: 'center', fontFamily: Fonts.bold },
  epBody: { flex: 1, gap: Spacing.half },
  epProgress: { marginTop: 2 },
  epToggle: { padding: 2 },
});
