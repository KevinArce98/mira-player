import { getPlayer } from '@/player/avplay';
import { Key } from '@/core/keys';
import { back, replace } from '@/core/router';
import type { Screen } from '@/core/router';
import { getSession } from '@/core/session';
import { saveProgress } from '@/core/progress';
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

  // Reproducción continua: al terminar un episodio de serie, busca el
  // siguiente (misma temporada o la próxima) y lo reproduce automáticamente.
  async function playNextEpisode(): Promise<void> {
    const r = opts.resume;
    if (r.kind !== 'series') {
      void back();
      return;
    }
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

        if (!nextEp) {
          void back();
          return;
        }

        const title = `${seriesName} — ${nextEp.title}`;
        const nextResume: ResumePayload = {
          kind: 'series',
          episodeId: nextEp.id,
          ext: nextEp.container_extension || 'mp4',
          seriesId: r.seriesId,
          title,
        };
        const media: MediaItem = { kind: 'series', id: r.seriesId, name: title, icon: opts.media.icon };
        await replace(() => createPlayerScreen({ title, media, resume: nextResume }));
        return;
      }
      void back();
    } catch {
      void back();
    }
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

      root.append(spinner, overlay);
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
          }
        },
        onBuffering: (active) => {
          spinner.style.display = active ? 'block' : 'none';
        },
        onEnd: () => {
          persist();
          if (opts.resume.kind === 'series') {
            void playNextEpisode();
          } else {
            void back();
          }
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
      persist();
      player.stop();
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
