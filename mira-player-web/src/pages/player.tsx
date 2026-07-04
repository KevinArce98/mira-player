import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Hls from 'hls.js';
import { ChevronDown, Play, Pause, Settings2, AlertTriangle, RotateCcw, RotateCw, Loader2, Maximize, Minimize } from 'lucide-react';
import { useContent, useProgressFor } from '@/hooks/data/use-content';
import { useEpisode } from '@/hooks/data/use-episodes';
import { useXtreamClient } from '@/hooks/data/use-xtream-client';
import { useProgressTracker } from '@/hooks/data/use-progress-tracker';
import { resolvePlaybackUrl } from '@/services/playback';
import { getNextEpisode } from '@/db/repositories/episodes';
import { setCompleted } from '@/db/repositories/progress';
import { useT } from '@/providers/preferences';
import { languageLabel } from '@/lib/language';
import type { Episodio } from '@/types/models';

const SKIP_SECONDS = 10;
const HIDE_DELAY = 3500;
const NEXT_EPISODE_COUNTDOWN = 10;

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

interface AudioTrackInfo { id: number; name: string; lang?: string }
interface SubTrackInfo { id: number; name: string; lang?: string }

export function PlayerPage() {
  const [params] = useSearchParams();
  const contentId = params.get('contentId') ?? '';
  const episodeId = params.get('episodeId') ?? undefined;
  return <PlayerView key={episodeId ?? contentId} contentId={contentId} episodeId={episodeId} />;
}

function PlayerView({ contentId, episodeId }: { contentId: string; episodeId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const { data: content } = useContent(contentId);
  const { data: episode } = useEpisode(episodeId);
  const { data: client } = useXtreamClient();
  const { data: progress } = useProgressFor(contentId, episodeId ?? null);

  const tracker = useProgressTracker({
    contentId,
    episodeId: episodeId ?? null,
    duracionTotal: episode?.duracion ?? null,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [subTracks, setSubTracks] = useState<SubTrackInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState(-1);
  const [selectedSub, setSelectedSub] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nextUp, setNextUp] = useState<Episodio | null>(null);
  const [countdown, setCountdown] = useState(NEXT_EPISODE_COUNTDOWN);

  const isLive = content?.tipo === 'live';

  const url = useMemo(() => {
    if (!client || !content) return null;
    if (content.tipo === 'series' && !episode) return null;
    try {
      return resolvePlaybackUrl(client, content, episode);
    } catch {
      return null;
    }
  }, [client, content, episode]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
    setControlsVisible(true);
  }, []);

  const handleCenterClick = useCallback(() => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      toggleFullscreen();
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      togglePlay();
    }, 250);
  }, [toggleFullscreen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  useEffect(() => {
    if (controlsVisible && !paused && !buffering && !menuOpen && scrubFraction === null) {
      scheduleHide();
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [controlsVisible, paused, buffering, menuOpen, scrubFraction, scheduleHide]);

  useEffect(() => {
    if (!url || !videoRef.current) return;
    const video = videoRef.current;
    video.setAttribute('referrerpolicy', 'no-referrer');
    setIsLoaded(false);
    setPlaybackError(null);
    seekedRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = url.includes('.m3u8') || url.includes('.ts');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => { (xhr as XMLHttpRequest & { referrerPolicy: string }).referrerPolicy = 'no-referrer'; },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        setAudioTracks(
          data.audioTracks.map((t) => ({
            id: t.id,
            name: t.name || (languageLabel(t.lang ?? null) ?? ''),
            lang: t.lang,
          })),
        );
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        setSubTracks(
          data.subtitleTracks.map((t) => ({
            id: t.id,
            name: t.name || (languageLabel(t.lang ?? null) ?? ''),
            lang: t.lang,
          })),
        );
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setPlaybackError(data.error?.message ?? t('player.error'));
        }
      });
    } else {
      video.src = url;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [url, t]);

  const handleLoaded = () => {
    setIsLoaded(true);
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && Number.isFinite(video.duration)) setDuration(video.duration);
    if (!isLive && progress?.posicion_segundos && progress.posicion_segundos > 5 && !seekedRef.current) {
      seekedRef.current = true;
      video.currentTime = progress.posicion_segundos;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (!isLive) tracker.report(video.currentTime);
  };

  const handleDurationChange = () => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) setDuration(video.duration);
  };

  const handleEnd = async () => {
    tracker.flush();
    if (isLive) { navigate(-1); return; }
    await setCompleted(contentId, true, episodeId ?? null);
    if (episodeId && episode) {
      const next = await getNextEpisode(contentId, episode.temporada, episode.episodio);
      if (next) {
        setCountdown(NEXT_EPISODE_COUNTDOWN);
        setNextUp(next);
        return;
      }
    }
    navigate(-1);
  };

  const playNext = useCallback(() => {
    if (!nextUp) return;
    void navigate(`/player?contentId=${contentId}&episodeId=${nextUp.id}`, { replace: true });
  }, [nextUp, contentId, navigate]);

  const cancelNext = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    if (!nextUp) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [nextUp]);

  useEffect(() => {
    if (nextUp && countdown <= 0) playNext();
  }, [nextUp, countdown, playNext]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPaused(false); }
    else { video.pause(); setPaused(true); }
    setControlsVisible(true);
  };

  const skip = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration || Infinity, video.currentTime + delta));
    setControlsVisible(true);
  };

  const seekToFraction = (f: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = f * duration;
  };

  const selectAudio = (id: number) => {
    setSelectedAudio(id);
    if (hlsRef.current) hlsRef.current.audioTrack = id;
  };

  const selectSub = (id: number) => {
    setSelectedSub(id);
    if (hlsRef.current) hlsRef.current.subtitleTrack = id;
  };

  const subtitleLabel =
    content?.tipo === 'series' && episode
      ? `T${episode.temporada} · E${episode.episodio}${episode.titulo ? `  ·  ${episode.titulo}` : ''}`
      : null;

  const displayFraction = scrubFraction ?? (duration > 0 ? currentTime / duration : 0);
  const displayTime = scrubFraction !== null ? scrubFraction * duration : currentTime;
  const hasTrackMenu = audioTracks.length > 1 || subTracks.length > 0;

  if (!url) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <Loader2 size={36} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black select-none"
      onClick={() => setControlsVisible((v) => !v)}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onLoadedData={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={() => void handleEnd()}
        onError={(e) => setPlaybackError((e.currentTarget as HTMLVideoElement).error?.message ?? t('player.error'))}
      />

      {(!isLoaded || buffering) ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60">
          <Loader2 size={40} className="animate-spin text-white" />
        </div>
      ) : null}

      {playbackError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <AlertTriangle size={32} style={{ color: '#E0857A' }} />
          <p style={{ color: '#fff', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>{playbackError}</p>
        </div>
      ) : null}

      {controlsVisible ? (
        <div className="absolute inset-0 pointer-events-none" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%)' }}
          />

          <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4 pointer-events-auto z-10">
            <button
              onClick={() => { tracker.flush(); navigate(-1); }}
              className="bg-black/40 border-0 rounded-[22px] w-11 h-11 flex items-center justify-center cursor-pointer text-white">
              <ChevronDown size={26} />
            </button>
            <div className="flex flex-col flex-1">
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: '"Montserrat", sans-serif' }}>
                {content?.nombre ?? ''}
              </span>
              {subtitleLabel ? (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{subtitleLabel}</span>
              ) : null}
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-black/40 border-0 rounded-[22px] w-11 h-11 flex items-center justify-center cursor-pointer text-white"
              aria-label={isFullscreen ? t('player.exitFullscreen') : t('player.fullscreen')}>
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
            {hasTrackMenu ? (
              <button
                onClick={() => setMenuOpen(true)}
                className="bg-black/40 border-0 rounded-[22px] w-11 h-11 flex items-center justify-center cursor-pointer text-white">
                <Settings2 size={22} />
              </button>
            ) : null}
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-[1]" onClick={handleCenterClick}>
            {buffering ? null : (
              <div className="flex items-center gap-10">
                {!isLive ? (
                  <button onClick={(e) => { e.stopPropagation(); skip(-SKIP_SECONDS); }}
                    className="bg-transparent border-0 cursor-pointer text-white">
                    <RotateCcw size={36} />
                  </button>
                ) : null}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="bg-black/45 border-0 rounded-[36px] w-[72px] h-[72px] flex items-center justify-center cursor-pointer text-white">
                  {paused ? <Play size={36} fill="#fff" /> : <Pause size={36} />}
                </button>
                {!isLive ? (
                  <button onClick={(e) => { e.stopPropagation(); skip(SKIP_SECONDS); }}
                    className="bg-transparent border-0 cursor-pointer text-white">
                    <RotateCw size={36} />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto z-10">
            {isLive ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E0857A' }} />
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>{t('player.live')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-white text-xs tabular-nums min-w-[40px] text-center">
                  {formatTime(displayTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={displayFraction}
                  className="flex-1 cursor-pointer [accent-color:var(--color-tint)]"
                  onMouseDown={() => { if (hideTimer.current) clearTimeout(hideTimer.current); setScrubFraction(displayFraction); }}
                  onChange={(e) => setScrubFraction(Number(e.target.value))}
                  onMouseUp={(e) => { seekToFraction(Number((e.target as HTMLInputElement).value)); setScrubFraction(null); scheduleHide(); }}
                />
                <span className="text-white text-xs tabular-nums min-w-[40px] text-center">
                  {formatTime(duration)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {nextUp ? (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/85 p-8"
          onClick={(e) => e.stopPropagation()}>
          <p className="text-white/70 text-sm font-semibold uppercase tracking-widest">
            {t('player.nextEpisode')}
          </p>
          <p className="text-white text-xl font-semibold text-center" style={{ fontFamily: '"Montserrat", sans-serif' }}>
            {`T${nextUp.temporada} · E${nextUp.episodio}${nextUp.titulo ? `  ·  ${nextUp.titulo}` : ''}`}
          </p>
          <p className="tabular-nums" style={{ color: '#D4AA7D', fontSize: 16 }}>
            {t('player.nextIn', { seconds: countdown })}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={playNext}
              className="flex items-center gap-2 px-5 py-3 rounded-full border-0 cursor-pointer font-bold"
              style={{ backgroundColor: '#D4AA7D', color: '#272727' }}>
              <Play size={16} fill="#272727" />
              {t('player.playNow')}
            </button>
            <button
              onClick={cancelNext}
              className="px-5 py-3 rounded-full bg-transparent cursor-pointer font-semibold text-white border border-white/40">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <div
          className="fixed inset-0 flex items-end justify-center bg-black/50 z-50"
          onClick={() => setMenuOpen(false)}>
          <div
            className="w-full max-w-md p-4 pb-8 rounded-t-2xl"
            style={{ backgroundColor: '#323230' }}
            onClick={(e) => e.stopPropagation()}>
            {audioTracks.length > 1 ? (
              <>
                <p style={{ color: '#A39C90', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {t('player.audio')}
                </p>
                {audioTracks.map((tr) => (
                  <button key={tr.id} onClick={() => selectAudio(tr.id)}
                    className="flex items-center justify-between w-full py-3.5 bg-transparent border-0 cursor-pointer"
                    style={{ color: '#F3EEE6', fontSize: 15 }}>
                    {tr.name}
                    {selectedAudio === tr.id ? <span style={{ color: '#D4AA7D' }}>✓</span> : null}
                  </button>
                ))}
              </>
            ) : null}
            {subTracks.length > 0 ? (
              <>
                <p style={{ color: '#A39C90', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: audioTracks.length > 1 ? 12 : 0 }}>
                  {t('player.subtitles')}
                </p>
                <button onClick={() => selectSub(-1)}
                  className="flex items-center justify-between w-full py-3.5 bg-transparent border-0 cursor-pointer"
                  style={{ color: '#F3EEE6', fontSize: 15 }}>
                  {t('player.off')}
                  {selectedSub === -1 ? <span style={{ color: '#D4AA7D' }}>✓</span> : null}
                </button>
                {subTracks.map((tr) => (
                  <button key={tr.id} onClick={() => selectSub(tr.id)}
                    className="flex items-center justify-between w-full py-3.5 bg-transparent border-0 cursor-pointer"
                    style={{ color: '#F3EEE6', fontSize: 15 }}>
                    {tr.name}
                    {selectedSub === tr.id ? <span style={{ color: '#D4AA7D' }}>✓</span> : null}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
