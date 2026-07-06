import { getPlayer } from '@/player/avplay';
import { Key, isBack } from '@/core/keys';
import { back, replace } from '@/core/router';
import type { Screen } from '@/core/router';
import { getSession } from '@/core/session';
import { saveProgress } from '@/core/progress';
import { runSync } from '@/services/sync/engine';
import type { MediaItem, ResumePayload } from '@/core/media';
import { el } from './dom';

export interface PlayerOptions {
  title: string;
  resume: ResumePayload;
  media: MediaItem;
  startMs?: number;
}

const SEEK_MS = 15000;
const SAVE_EVERY_MS = 5000;
const NEXT_COUNTDOWN_SECONDS = 10;
// Xtream no expone metadata de créditos: se aproxima mostrando el aviso
// cuando quedan estos segundos para el final.
const NEXT_EPISODE_LEAD_MS = 30000;

interface NextEpisodeInfo {
  title: string;
  media: MediaItem;
  resume: ResumePayload;
}

export function createPlayerScreen(opts: PlayerOptions): Screen {
  const player = getPlayer();
  const { client, acctKey } = getSession();
  const live = opts.resume.kind === 'live';
  let durationMs = 0;
  let positionMs = 0;
  let resumed = false;
  let lastSaved = 0;
  let overlay: HTMLElement;
  let bar: HTMLElement;
  let status: HTMLElement;
  let epgEl: HTMLElement;
  let spinner: HTMLElement;
  let hideTimer: number | undefined;
  let nextOverlay: HTMLElement;
  let nextTitleEl: HTMLElement;
  let nextCountdownEl: HTMLElement;
  let nextCountdownTimer: number | undefined;
  let nextRemaining = 0;
  let pendingNext: NextEpisodeInfo | undefined;
  let nextFetchAttempted = false;
  let cachedNext: NextEpisodeInfo | null = null;
  let nextEarly = false;

  function showOverlay(): void {
    overlay.classList.remove('hidden');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => overlay.classList.add('hidden'), 4000);
  }

  function persist(): void {
    if (live || durationMs <= 0) return;
    saveProgress(acctKey, opts.media, opts.resume, positionMs, durationMs);
  }

  function streamUrl(): string {
    const r = opts.resume;
    if (r.kind === 'live') return client.liveStreamUrl(r.streamId);
    if (r.kind === 'movie') return client.movieStreamUrl(r.streamId, r.ext);
    return client.seriesStreamUrl(r.episodeId, r.ext);
  }

  // Busca el siguiente episodio de la serie (misma temporada o la próxima).
  // Devuelve null si no hay más episodios o si algo falla.
  async function resolveNextEpisode(): Promise<NextEpisodeInfo | null> {
    const r = opts.resume;
    if (r.kind !== 'series') return null;
    try {
      const info = await client.seriesInfo(r.seriesId);
      const seasons = Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));
      const seriesName = info.info.name || opts.title.split(' — ')[0] || opts.title;

      for (let si = 0; si < seasons.length; si++) {
        const eps = info.episodes[seasons[si]] ?? [];
        const idx = eps.findIndex((e) => e.id === r.episodeId);
        if (idx < 0) continue;

        let nextEp = eps[idx + 1];
        let nextSeasonIdx = si;
        while (!nextEp && ++nextSeasonIdx < seasons.length) {
          nextEp = (info.episodes[seasons[nextSeasonIdx]] ?? [])[0];
        }
        if (!nextEp) return null;

        const title = `${seriesName} — ${nextEp.title}`;
        const nextResume: ResumePayload = {
          kind: 'series',
          episodeId: nextEp.id,
          ext: nextEp.container_extension || 'mp4',
          seriesId: r.seriesId,
          title,
          season: Number(nextEp.season),
          episodeNum: Number(nextEp.episode_num),
        };
        const media: MediaItem = { kind: 'series', id: r.seriesId, name: title, icon: opts.media.icon };
        return { title, media, resume: nextResume };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function ensureNextFetched(): Promise<NextEpisodeInfo | null> {
    if (nextFetchAttempted) return cachedNext;
    nextFetchAttempted = true;
    cachedNext = await resolveNextEpisode();
    return cachedNext;
  }

  // Muestra el aviso apenas se cruza el umbral de "créditos" (ver
  // NEXT_EPISODE_LEAD_MS), sin countdown forzado: el video sigue
  // reproduciéndose y el avance real ocurre en onEnd cuando de verdad termina.
  function showNextPromptEarly(info: NextEpisodeInfo): void {
    pendingNext = info;
    nextEarly = true;
    nextTitleEl.textContent = info.title;
    nextCountdownEl.textContent = 'Se reproducirá al terminar';
    nextOverlay.classList.remove('hidden');
    nextOverlay.classList.add('next-overlay-early');
  }

  // Fallback (el umbral nunca se cruzó a tiempo, ej. duración desconocida):
  // 10s de cuenta regresiva con opción de cancelar, tipo Netflix, igual que antes.
  async function playNextEpisode(): Promise<void> {
    const info = await ensureNextFetched();
    if (!info) {
      void back();
      return;
    }
    nextEarly = false;
    pendingNext = info;
    nextRemaining = NEXT_COUNTDOWN_SECONDS;
    nextTitleEl.textContent = info.title;
    updateNextCountdown();
    nextOverlay.classList.remove('next-overlay-early');
    nextOverlay.classList.remove('hidden');
    overlay.classList.add('hidden');
    window.clearTimeout(hideTimer);
    nextCountdownTimer = window.setInterval(() => {
      nextRemaining -= 1;
      if (nextRemaining <= 0) {
        void confirmPlayNext();
        return;
      }
      updateNextCountdown();
    }, 1000);
  }

  function updateNextCountdown(): void {
    nextCountdownEl.textContent = `Se reproducirá en ${nextRemaining} s`;
  }

  function stopNextCountdown(): void {
    window.clearInterval(nextCountdownTimer);
    nextCountdownTimer = undefined;
    nextOverlay.classList.add('hidden');
    nextOverlay.classList.remove('next-overlay-early');
    pendingNext = undefined;
  }

  async function confirmPlayNext(): Promise<void> {
    const info = pendingNext;
    stopNextCountdown();
    if (!info) return;
    await replace(() => createPlayerScreen({ title: info.title, media: info.media, resume: info.resume }));
  }

  function cancelNext(): void {
    const wasEarly = nextEarly;
    stopNextCountdown();
    nextEarly = false;
    // Si era el aviso temprano, solo se oculta: el video sigue reproduciéndose
    // y avanzará solo cuando termine de verdad (ver onEnd).
    if (!wasEarly) void back();
  }

  async function loadEpg(): Promise<void> {
    if (opts.resume.kind !== 'live') return;
    try {
      const epg = await client.shortEpg(opts.resume.streamId);
      if (epg.now) {
        epgEl.innerHTML = `<strong>${escapeHtml(epg.now.title)}</strong>${
          epg.next ? ` · luego: ${escapeHtml(epg.next.title)}` : ''
        }`;
      }
    } catch {
      /* EPG opcional */
    }
  }

  return {
    render(root) {
      spinner = el('div', { class: 'spinner', html: 'Cargando…' });
      status = el('div', { class: 'player-sub', html: live ? 'En vivo' : '' });
      epgEl = el('div', { class: 'player-epg', html: '' });
      bar = el('div', {}, []);
      const progress = el('div', { class: 'progress' }, [bar]);

      overlay = el('div', { class: 'player-overlay' }, [
        el('div', { class: 'player-now', html: escapeHtml(opts.title) }),
        status,
        epgEl,
        live ? el('div', {}) : progress,
        el('div', {
          class: 'player-hint',
          html: live ? 'OK pausa · Atrás para volver' : 'OK pausa · ◀ ▶ 15s · Atrás para volver',
        }),
      ]);

      nextTitleEl = el('div', { class: 'next-title', html: '' });
      nextCountdownEl = el('div', { class: 'next-countdown', html: '' });
      const nextPlayBtn = el('button', { class: 'btn', html: 'Reproducir ahora' });
      const nextCancelBtn = el('button', { class: 'btn-secondary btn', html: 'Cancelar' });
      nextPlayBtn.addEventListener('click', () => void confirmPlayNext());
      nextCancelBtn.addEventListener('click', () => cancelNext());
      nextOverlay = el('div', { class: 'next-overlay hidden' }, [
        el('div', { class: 'next-tag', html: 'Siguiente episodio' }),
        nextTitleEl,
        nextCountdownEl,
        el('div', { class: 'next-actions' }, [nextPlayBtn, nextCancelBtn]),
      ]);

      root.append(spinner, overlay, nextOverlay);
      showOverlay();
      void loadEpg();

      player.play(streamUrl(), {
        onReady: (d) => {
          durationMs = d;
          spinner.style.display = 'none';
          if (!live && !resumed && (opts.startMs ?? 0) > 3000) {
            resumed = true;
            player.seekBy(opts.startMs!);
          }
        },
        onTime: (t) => {
          positionMs = t;
          if (!live && durationMs > 0) {
            bar.style.width = `${Math.min(100, (t / durationMs) * 100)}%`;
            if (t - lastSaved > SAVE_EVERY_MS) {
              lastSaved = t;
              persist();
            }
            if (
              opts.resume.kind === 'series' &&
              !nextFetchAttempted &&
              !pendingNext &&
              durationMs - t <= NEXT_EPISODE_LEAD_MS
            ) {
              void ensureNextFetched().then((info) => {
                if (info) showNextPromptEarly(info);
              });
            }
          }
        },
        onBuffering: (active) => {
          spinner.style.display = active ? 'block' : 'none';
        },
        onEnd: () => {
          persist();
          if (opts.resume.kind !== 'series') {
            void back();
            return;
          }
          if (pendingNext) {
            // El aviso ya estaba visible (créditos) y no se canceló: el
            // video terminó de verdad, avanzamos ya.
            void confirmPlayNext();
            return;
          }
          if (nextFetchAttempted) {
            // Se mostró antes y se canceló (o no había siguiente episodio):
            // el video terminó de verdad, avanza directo sin volver a preguntar.
            if (cachedNext) {
              const info = cachedNext;
              void replace(() => createPlayerScreen({ title: info.title, media: info.media, resume: info.resume }));
            } else {
              void back();
            }
            return;
          }
          // Fallback: el umbral nunca se cruzó a tiempo.
          void playNextEpisode();
        },
        onError: (msg) => {
          spinner.style.display = 'none';
          status.textContent = msg;
          status.style.color = 'var(--danger)';
          overlay.classList.remove('hidden');
          window.clearTimeout(hideTimer);
        },
      });
    },

    onKey(keyCode) {
      if (pendingNext) {
        if (keyCode === Key.Enter || keyCode === Key.MediaPlayPause || keyCode === Key.MediaPlay) {
          void confirmPlayNext();
          return true;
        }
        if (isBack(keyCode)) {
          cancelNext();
          return true;
        }
        return true;
      }
      switch (keyCode) {
        case Key.Enter:
        case Key.MediaPlayPause: {
          const paused = player.togglePause();
          status.textContent = paused ? 'Pausa' : live ? 'En vivo' : '';
          showOverlay();
          return true;
        }
        case Key.MediaPlay:
          player.resume();
          showOverlay();
          return true;
        case Key.MediaPause:
          player.pause();
          showOverlay();
          return true;
        case Key.Left:
        case Key.MediaRewind:
          if (!live) player.seekBy(-SEEK_MS);
          showOverlay();
          return true;
        case Key.Right:
        case Key.MediaFastForward:
          if (!live) player.seekBy(SEEK_MS);
          showOverlay();
          return true;
        case Key.Up:
        case Key.Down:
          showOverlay();
          return true;
        default:
          return false;
      }
    },

    onExit() {
      window.clearTimeout(hideTimer);
      window.clearInterval(nextCountdownTimer);
      persist();
      void runSync();
      player.stop();
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
