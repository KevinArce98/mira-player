import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, {
  SelectedTrackType,
  type AudioTrack,
  type OnAudioTracksData,
  type OnLoadData,
  type OnProgressData,
  type OnTextTracksData,
  type OnVideoErrorData,
  type SelectedTrack,
  type TextTrack,
  type VideoRef,
} from 'react-native-video';

import { SeekBar } from '@/components/media/seek-bar';
import { Fonts } from '@/constants/theme';
import { languageLabel } from '@/lib/language';
import { usePreferences } from '@/providers/preferences';
import type { TranslationKey } from '@/lib/i18n';
import { getNextEpisode } from '@/db/repositories/episodes';
import { setCompleted } from '@/db/repositories/progress';
import { useContent, useProgressFor } from '@/hooks/data/use-content';
import { useEpisode } from '@/hooks/data/use-episodes';
import { useSubtitleLang } from '@/hooks/data/use-preferences';
import { useProgressTracker } from '@/hooks/data/use-progress-tracker';
import { useXtreamClient } from '@/hooks/data/use-xtream-client';
import { resolvePlaybackUrl } from '@/services/playback';
import { recordCompletedPlayback } from '@/services/rating';
import type { Episodio } from '@/types/models';

const DISABLED_TRACK: SelectedTrack = { type: SelectedTrackType.DISABLED };
const SYSTEM_AUDIO: SelectedTrack = { type: SelectedTrackType.SYSTEM };
const SKIP_SECONDS = 10;
const HIDE_DELAY = 3500;
const NEXT_EPISODE_COUNTDOWN = 10;

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function audioTrackLabel(track: AudioTrack, t: Translate): string {
  return track.title || languageLabel(track.language) || t('player.track', { number: track.index + 1 });
}

function textTrackLabel(track: TextTrack, t: Translate): string {
  return track.title || languageLabel(track.language) || t('player.track', { number: track.index + 1 });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function PlayerScreen() {
  const { contentId, episodeId } = useLocalSearchParams<{ contentId: string; episodeId?: string }>();
  return <PlayerView key={episodeId ?? contentId} contentId={contentId} episodeId={episodeId} />;
}

function PlayerView({ contentId, episodeId }: { contentId: string; episodeId?: string }) {
  useKeepAwake();

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync();
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []),
  );

  const { t } = usePreferences();
  const { data: content } = useContent(contentId);
  const { data: episode } = useEpisode(episodeId);
  const { data: client } = useXtreamClient();
  const { data: progress } = useProgressFor(contentId, episodeId ?? null);
  const { lang: preferredLang, setLang } = useSubtitleLang();

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isLive = content?.tipo === 'live';

  const tracker = useProgressTracker({
    contentId,
    episodeId: episodeId ?? null,
    duracionTotal: episode?.duracion ?? null,
  });

  const videoRef = useRef<VideoRef>(null);
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack>(DISABLED_TRACK);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<SelectedTrack>(SYSTEM_AUDIO);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [nextUp, setNextUp] = useState<Episodio | null>(null);
  const [countdown, setCountdown] = useState(NEXT_EPISODE_COUNTDOWN);
  const seekedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (paused || buffering || menuOpen || scrubFraction !== null) return;
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
  }, [paused, buffering, menuOpen, scrubFraction, clearHideTimer]);

  useEffect(() => {
    if (controlsVisible) scheduleHide();
    return clearHideTimer;
  }, [controlsVisible, scheduleHide, clearHideTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const toggleControls = useCallback(() => {
    setControlsVisible((v) => !v);
  }, []);

  const needsEpisode = content?.tipo === 'series';
  const url = useMemo(() => {
    if (!client || !content) return null;
    if (needsEpisode && !episode) return null;
    try {
      return resolvePlaybackUrl(client, content, episode);
    } catch {
      return null;
    }
  }, [client, content, episode, needsEpisode]);

  const subtitleLabel = useMemo(() => {
    if (content?.tipo !== 'series' || !episode) return null;
    const base = `T${episode.temporada} · E${episode.episodio}`;
    return episode.titulo ? `${base}  ·  ${episode.titulo}` : base;
  }, [content?.tipo, episode]);

  const onLoad = (data: OnLoadData) => {
    setIsLoaded(true);
    if (data.duration && Number.isFinite(data.duration)) setDuration(data.duration);
    else if (episode?.duracion) setDuration(episode.duracion);
    if (!isLive && progress?.posicion_segundos && progress.posicion_segundos > 5 && !seekedRef.current) {
      seekedRef.current = true;
      videoRef.current?.seek(progress.posicion_segundos);
    }
  };

  const onProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    if (!isLive) tracker.report(data.currentTime);
  };

  const onTextTracks = (e: OnTextTracksData) => {
    const tracks = e.textTracks ?? [];
    setTextTracks(tracks);
    if (preferredLang) {
      const match = tracks.find((t) => t.language === preferredLang);
      if (match) setSelectedTrack({ type: SelectedTrackType.LANGUAGE, value: preferredLang });
    }
  };

  const onAudioTracks = (e: OnAudioTracksData) => {
    setAudioTracks(e.audioTracks ?? []);
  };

  const onError = (e: OnVideoErrorData) => {
    const detail =
      e.error?.localizedDescription || e.error?.errorString || e.error?.error || t('player.error');
    setPlaybackError(detail);
  };

  const onEnd = async () => {
    tracker.flush();
    if (isLive) {
      router.back();
      return;
    }
    await setCompleted(contentId, true, episodeId ?? null);
    void recordCompletedPlayback();
    if (episodeId && episode) {
      const next = await getNextEpisode(contentId, episode.temporada, episode.episodio);
      if (next) {
        setCountdown(NEXT_EPISODE_COUNTDOWN);
        setNextUp(next);
        return;
      }
    }
    router.back();
  };

  const playNext = useCallback(() => {
    if (!nextUp) return;
    router.replace({ pathname: '/player', params: { contentId, episodeId: nextUp.id } });
  }, [nextUp, contentId]);

  const cancelNext = useCallback(() => {
    router.back();
  }, []);

  useEffect(() => {
    if (!nextUp) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [nextUp]);

  useEffect(() => {
    if (nextUp && countdown <= 0) playNext();
  }, [nextUp, countdown, playNext]);

  const togglePlay = () => {
    setPaused((p) => !p);
    showControls();
  };

  const skip = (delta: number) => {
    const upperBound = duration > 0 ? duration : currentTime + delta;
    const target = Math.max(0, Math.min(upperBound, currentTime + delta));
    videoRef.current?.seek(target);
    setCurrentTime(target);
    showControls();
  };

  const seekToFraction = (fraction: number) => {
    if (!duration) return;
    const target = fraction * duration;
    videoRef.current?.seek(target);
    setCurrentTime(target);
  };

  const chooseTrack = (track: TextTrack | null) => {
    if (!track) {
      setSelectedTrack(DISABLED_TRACK);
      setLang(null);
      return;
    }
    if (track.language) {
      setSelectedTrack({ type: SelectedTrackType.LANGUAGE, value: track.language });
      setLang(track.language);
    } else {
      setSelectedTrack({ type: SelectedTrackType.INDEX, value: track.index });
    }
  };

  const chooseAudio = (track: AudioTrack) => {
    if (track.language) {
      setSelectedAudio({ type: SelectedTrackType.LANGUAGE, value: track.language });
    } else {
      setSelectedAudio({ type: SelectedTrackType.INDEX, value: track.index });
    }
  };

  const audioSelected = (track: AudioTrack) => {
    if (selectedAudio.type === SelectedTrackType.LANGUAGE) return selectedAudio.value === track.language;
    if (selectedAudio.type === SelectedTrackType.INDEX) return selectedAudio.value === track.index;
    return !!track.selected;
  };

  const hasTrackMenu = audioTracks.length > 1 || textTracks.length > 0;

  const close = () => {
    tracker.flush();
    router.back();
  };

  if (!url) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const displayFraction = scrubFraction ?? (duration > 0 ? currentTime / duration : 0);
  const displayTime = scrubFraction !== null ? scrubFraction * duration : currentTime;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={StyleSheet.absoluteFill}
        paused={paused}
        resizeMode="contain"
        selectedTextTrack={selectedTrack}
        selectedAudioTrack={selectedAudio}
        onLoad={onLoad}
        onProgress={onProgress}
        onTextTracks={onTextTracks}
        onAudioTracks={onAudioTracks}
        onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
        onError={onError}
        onEnd={onEnd}
        progressUpdateInterval={1000}
      />

      {!isLoaded ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}

      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />

      {playbackError ? (
        <View style={styles.errorBox} pointerEvents="none">
          <Ionicons name="warning-outline" size={28} color="#E0857A" />
          <Text style={styles.errorText}>{playbackError}</Text>
        </View>
      ) : null}

      {controlsVisible ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.scrim} pointerEvents="none" />

          <View style={styles.center} pointerEvents="box-none">
            {buffering ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <View style={styles.centerRow} pointerEvents="box-none">
                {!isLive ? (
                  <Pressable onPress={() => skip(-SKIP_SECONDS)} hitSlop={12} style={styles.skipButton}>
                    <MaterialIcons name="replay-10" size={40} color="#fff" />
                  </Pressable>
                ) : null}
                <Pressable onPress={togglePlay} hitSlop={12} style={styles.playButton}>
                  <Ionicons name={paused ? 'play' : 'pause'} size={44} color="#fff" />
                </Pressable>
                {!isLive ? (
                  <Pressable onPress={() => skip(SKIP_SECONDS)} hitSlop={12} style={styles.skipButton}>
                    <MaterialIcons name="forward-10" size={40} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <View
            style={[styles.topBar, {
              paddingTop: isLandscape ? 4 : Math.max(insets.top, 8),
              paddingLeft: Math.max(insets.left, 12),
              paddingRight: Math.max(insets.right, 12),
              paddingBottom: 8,
            }]}
            pointerEvents="box-none">
            <Pressable onPress={close} hitSlop={12} style={styles.iconButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>
            <View style={styles.titleBox} pointerEvents="none">
              <Text style={styles.title} numberOfLines={1}>
                {content?.nombre ?? ''}
              </Text>
              {subtitleLabel ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitleLabel}
                </Text>
              ) : null}
            </View>
            {hasTrackMenu ? (
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.iconButton}>
                <Ionicons name="options-outline" size={24} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.iconButton} />
            )}
          </View>

          <View
            style={[styles.bottomBar, {
              paddingBottom: Math.max(insets.bottom, 8),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
              paddingTop: 8,
            }]}
            pointerEvents="box-none">
            {isLive ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('player.live')}</Text>
              </View>
            ) : (
              <View style={styles.seekRow} pointerEvents="box-none">
                <Text style={styles.time}>{formatTime(displayTime)}</Text>
                <View style={styles.seekBarWrap}>
                  <SeekBar
                    position={displayFraction}
                    onScrubStart={() => {
                      clearHideTimer();
                      setScrubFraction(displayFraction);
                    }}
                    onScrub={setScrubFraction}
                    onScrubEnd={() => scheduleHide()}
                    onSeek={(f) => {
                      seekToFraction(f);
                      setScrubFraction(null);
                    }}
                  />
                </View>
                <Text style={styles.time}>{formatTime(duration)}</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {nextUp ? (
        <View style={styles.nextOverlay}>
          <Text style={styles.nextTitle}>{t('player.nextEpisode')}</Text>
          <Text style={styles.nextEpisodeLabel} numberOfLines={1}>
            {`T${nextUp.temporada} · E${nextUp.episodio}${nextUp.titulo ? `  ·  ${nextUp.titulo}` : ''}`}
          </Text>
          <Text style={styles.nextCountdown}>{t('player.nextIn', { seconds: countdown })}</Text>
          <View style={styles.nextButtons}>
            <Pressable onPress={playNext} style={styles.nextPlayButton}>
              <Ionicons name="play" size={18} color="#272727" />
              <Text style={styles.nextPlayText}>{t('player.playNow')}</Text>
            </Pressable>
            <Pressable onPress={cancelNext} style={styles.nextCancelButton}>
              <Text style={styles.nextCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {audioTracks.length > 1 ? (
              <>
                <Text style={styles.sheetTitle}>{t('player.audio')}</Text>
                {audioTracks.map((track) => {
                  const isSelected = audioSelected(track);
                  return (
                    <Pressable key={`a-${track.index}`} style={styles.sheetRow} onPress={() => chooseAudio(track)}>
                      <Text style={styles.sheetText}>{audioTrackLabel(track, t)}</Text>
                      {isSelected ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {textTracks.length > 0 ? (
              <>
                <Text style={[styles.sheetTitle, audioTracks.length > 1 && styles.sheetTitleSpaced]}>
                  {t('player.subtitles')}
                </Text>
                <Pressable style={styles.sheetRow} onPress={() => chooseTrack(null)}>
                  <Text style={styles.sheetText}>{t('player.off')}</Text>
                  {selectedTrack.type === SelectedTrackType.DISABLED ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : null}
                </Pressable>
                {textTracks.map((track) => {
                  const isSelected =
                    selectedTrack.type === SelectedTrackType.LANGUAGE && selectedTrack.value === track.language;
                  return (
                    <Pressable key={`s-${track.index}`} style={styles.sheetRow} onPress={() => chooseTrack(track)}>
                      <Text style={styles.sheetText}>{textTrackLabel(track, t)}</Text>
                      {isSelected ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 16, fontFamily: Fonts.displaySemibold },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: Fonts.regular, marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  skipButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  seekRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seekBarWrap: { flex: 1 },
  time: { color: '#fff', fontSize: 13, fontFamily: Fonts.medium, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0857A' },
  liveText: { color: '#fff', fontSize: 13, fontFamily: Fonts.semibold, letterSpacing: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#323230', padding: 16, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { color: '#A39C90', fontSize: 13, fontFamily: Fonts.semibold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetTitleSpaced: { marginTop: 16 },
  errorBox: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: '45%',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: '#fff', fontSize: 14, fontFamily: Fonts.medium, textAlign: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetText: { color: '#F3EEE6', fontSize: 16, fontFamily: Fonts.medium },
  nextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  nextTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 1 },
  nextEpisodeLabel: { color: '#fff', fontSize: 20, fontFamily: Fonts.displaySemibold, textAlign: 'center' },
  nextCountdown: { color: '#D4AA7D', fontSize: 16, fontFamily: Fonts.medium, fontVariant: ['tabular-nums'] },
  nextButtons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  nextPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D4AA7D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  nextPlayText: { color: '#272727', fontSize: 15, fontFamily: Fonts.bold },
  nextCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  nextCancelText: { color: '#fff', fontSize: 15, fontFamily: Fonts.semibold },
});
