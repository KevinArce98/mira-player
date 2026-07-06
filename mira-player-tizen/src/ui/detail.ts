import type { Screen } from '@/core/router';
import { navigate } from '@/core/router';
import { getSession } from '@/core/session';
import { getProgress } from '@/core/progress';
import { focusFirst } from '@/core/navigation';
import type { MediaItem, ResumePayload } from '@/core/media';
import type { XtreamEpisode, XtreamSeriesInfo } from '@/types/xtream';
import { el, poster } from './dom';
import { escapeHtml } from './cards';
import { createPlayerScreen } from './player-screen';

export function createDetailScreen(series: MediaItem): Screen {
  const { client, acctKey } = getSession();
  let info: XtreamSeriesInfo;
  let seasons: string[] = [];
  let episodeList: HTMLElement;

  function playEpisode(ep: XtreamEpisode): void {
    const title = `${series.name} — ${ep.title}`;
    const resume: ResumePayload = {
      kind: 'series',
      episodeId: ep.id,
      ext: ep.container_extension || 'mp4',
      seriesId: series.id,
      title,
      season: Number(ep.season),
      episodeNum: Number(ep.episode_num),
    };
    const media: MediaItem = { kind: 'series', id: series.id, name: title, icon: series.icon };
    const prog = getProgress(acctKey, resume);
    void navigate(() =>
      createPlayerScreen({ title, media, resume, startMs: prog?.positionMs }),
    );
  }

  function renderEpisodes(season: string): void {
    const eps = info.episodes[season] ?? [];
    episodeList.innerHTML = '';
    if (eps.length === 0) {
      episodeList.append(el('div', { class: 'empty', html: 'Sin episodios en esta temporada.' }));
      return;
    }
    eps.forEach((ep) => {
      const watched = getProgress(acctKey, {
        kind: 'series',
        episodeId: ep.id,
        ext: ep.container_extension || 'mp4',
        seriesId: series.id,
        title: '',
        season: Number(ep.season),
        episodeNum: Number(ep.episode_num),
      });
      const pct =
        watched && watched.durationMs > 0
          ? Math.min(100, (watched.positionMs / watched.durationMs) * 100)
          : 0;
      const row = el('div', { class: 'episode focusable' }, [
        el('div', { class: 'episode-num', html: String(ep.episode_num) }),
        el('div', { class: 'episode-body' }, [
          el('div', { class: 'episode-title', html: escapeHtml(ep.title) }),
          pct > 0
            ? el('div', { class: 'episode-bar' }, [el('div', { style: `width:${pct}%` })])
            : el('div', { class: 'episode-sub', html: ep.info?.duration || '' }),
        ]),
      ]);
      row.addEventListener('click', () => playEpisode(ep));
      episodeList.append(row);
    });
  }

  return {
    async render(root) {
      root.innerHTML = '<div class="screen"><div class="loading">Cargando…</div></div>';
      try {
        info = await client.seriesInfo(series.id);
      } catch (e) {
        root.innerHTML = '';
        root.append(el('div', { class: 'screen' }, [
          el('div', { class: 'empty', html: `No se pudo cargar la serie. ${(e as Error).message}` }),
        ]));
        return;
      }
      seasons = Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));

      const seasonTabs = el(
        'div',
        { class: 'season-tabs' },
        seasons.map((s) => {
          const tab = el('div', { class: 'tab focusable', html: `Temporada ${s}` });
          tab.addEventListener('click', () => {
            seasonTabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            renderEpisodes(s);
          });
          return tab;
        }),
      );

      episodeList = el('div', { class: 'episode-list screen-scroll' });

      const header = el('div', { class: 'detail-header' }, [
        poster(info.info.cover || series.icon, 'detail-poster'),
        el('div', { class: 'detail-meta' }, [
          el('div', { class: 'detail-title', html: escapeHtml(info.info.name || series.name) }),
          el('div', { class: 'detail-genre', html: escapeHtml(info.info.genre || '') }),
          el('div', { class: 'detail-plot', html: escapeHtml(info.info.plot || '') }),
        ]),
      ]);

      root.innerHTML = '';
      root.append(
        el('div', { class: 'screen' }, [
          header,
          seasonTabs,
          episodeList,
        ]),
      );

      const firstSeason = seasons[0];
      if (firstSeason) {
        seasonTabs.querySelector('.tab')?.classList.add('active');
        renderEpisodes(firstSeason);
      }
      focusFirst(root);
    },
  };
}
