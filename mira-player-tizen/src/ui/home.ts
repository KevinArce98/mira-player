import { loadAccount, clearAccount } from '@/core/store';
import { initSession, clearSession } from '@/core/session';
import { focusFirst, focusElement, currentFocus } from '@/core/navigation';
import { navigate, reset } from '@/core/router';
import type { Screen } from '@/core/router';
import { Key } from '@/core/keys';
import type { MediaItem, MediaKind } from '@/core/media';
import { continueWatching, type ProgressEntry } from '@/core/progress';
import { listFavorites } from '@/core/favorites';
import { el } from './dom';
import { mediaCard, toggleCardFavorite, escapeHtml } from './cards';
import { openMedia } from './actions';
import { createPlayerScreen } from './player-screen';
import { createSetupScreen } from './setup';

type Tab = 'home' | 'live' | 'movies' | 'series' | 'search';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'live', label: 'En vivo' },
  { id: 'movies', label: 'Películas' },
  { id: 'series', label: 'Series' },
  { id: 'search', label: 'Buscar' },
];

const KIND_OF: Record<'live' | 'movies' | 'series', MediaKind> = {
  live: 'live',
  movies: 'movie',
  series: 'series',
};

export function createHomeScreen(): Screen {
  const account = loadAccount();
  if (!account) return { render: () => void reset(createSetupScreen) };
  const session = initSession(account);
  const { library, acctKey } = session;

  let activeTab: Tab = 'home';
  let content: HTMLElement;

  function selectTab(tab: Tab, tabEls: HTMLElement[]): void {
    activeTab = tab;
    tabEls.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    void renderContent();
  }

  async function renderContent(): Promise<void> {
    content.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      if (activeTab === 'home') await renderHome();
      else if (activeTab === 'search') renderSearch();
      else await renderCatalog(KIND_OF[activeTab]);
    } catch (e) {
      content.innerHTML = '';
      content.append(el('div', { class: 'empty', html: `No se pudo cargar. ${(e as Error).message}` }));
    }
  }

  function resumeEntry(entry: ProgressEntry): void {
    void navigate(() =>
      createPlayerScreen({
        title: entry.item.name,
        media: entry.item,
        resume: entry.resume,
        startMs: entry.positionMs,
      }),
    );
  }

  async function firstCategoryItems(kind: MediaKind): Promise<MediaItem[]> {
    const cats = await library.categories(kind);
    return (await library.content(kind, cats[0]?.category_id)).slice(0, 24);
  }

  async function renderHome(): Promise<void> {
    const watching = continueWatching(acctKey);
    const favs = listFavorites(acctKey);
    const [live, movies, series] = await Promise.all([
      firstCategoryItems('live'),
      firstCategoryItems('movie'),
      firstCategoryItems('series'),
    ]);

    content.innerHTML = '';
    if (watching.length) {
      content.append(
        rail('Continuar viendo', watching.map((e) => mediaCard(e.item, () => resumeEntry(e)))),
      );
    }
    if (favs.length) {
      content.append(rail('Favoritos', favs.map((f) => mediaCard(f, () => openMedia(f)))));
    }
    content.append(
      rail('En vivo', live.map((s) => mediaCard(s, () => openMedia(s)))),
      rail('Películas', movies.map((m) => mediaCard(m, () => openMedia(m)))),
      rail('Series', series.map((s) => mediaCard(s, () => openMedia(s)))),
    );
    focusFirst(content);
  }

  async function renderCatalog(kind: MediaKind): Promise<void> {
    const cats = await library.categories(kind);
    content.innerHTML = '';
    const grid = el('div', { class: 'cat-grid screen-scroll' });

    async function loadCategory(catId: string | undefined, button: HTMLElement): Promise<void> {
      content.querySelectorAll('.cat-item').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      grid.innerHTML = '<div class="loading">Cargando…</div>';
      const items = await library.content(kind, catId);
      grid.innerHTML = '';
      if (!items.length) {
        grid.append(el('div', { class: 'empty', html: 'Sin contenido.' }));
        return;
      }
      grid.append(el('div', { class: 'grid' }, items.map((it) => mediaCard(it, () => openMedia(it)))));
    }

    const list = el('div', { class: 'cat-list screen-scroll' });
    cats.forEach((c, i) => {
      const button = el('div', { class: 'cat-item focusable', html: escapeHtml(c.category_name) });
      button.addEventListener('click', () => void loadCategory(c.category_id, button));
      list.append(button);
      if (i === 0) {
        button.classList.add('active');
        void loadCategory(c.category_id, button);
      }
    });

    content.append(el('div', { class: 'catalog' }, [list, grid]));
    focusElement(list.querySelector<HTMLElement>('.cat-item'));
  }

  function renderSearch(): void {
    content.innerHTML = '';
    const input = el('input', {
      class: 'focusable search-input',
      type: 'text',
      placeholder: 'Buscar películas, series o canales…',
    });
    const results = el('div', { class: 'cat-grid screen-scroll' });

    async function run(): Promise<void> {
      const q = input.value.trim();
      if (!q) return;
      results.innerHTML = '<div class="loading">Buscando…</div>';
      const items = await library.search(q);
      results.innerHTML = '';
      if (!items.length) {
        results.append(el('div', { class: 'empty', html: `Sin resultados para "${escapeHtml(q)}".` }));
        return;
      }
      results.append(el('div', { class: 'grid' }, items.map((it) => mediaCard(it, () => openMedia(it)))));
    }

    input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).keyCode === Key.Enter) {
        e.stopPropagation();
        void run();
      }
    });
    const btn = el('button', { class: 'focusable btn', html: 'Buscar' });
    btn.addEventListener('click', () => void run());

    const wrap = el('div', { class: 'search-wrap' }, [
      el('div', { class: 'search-bar' }, [input, btn]),
      results,
    ]);
    content.append(wrap);
    focusElement(input);
  }

  return {
    render(root) {
      const tabEls = TABS.map((t) => {
        const tab = el('div', { class: 'tab focusable', html: t.label });
        tab.dataset.tab = t.id;
        tab.addEventListener('click', () => selectTab(t.id, tabEls));
        return tab;
      });
      const exitBtn = el('div', { class: 'tab focusable', html: 'Salir' });
      exitBtn.addEventListener('click', () => {
        clearAccount();
        clearSession();
        void reset(createSetupScreen);
      });

      const topbar = el('div', { class: 'topbar' }, [
        el('div', { class: 'brand', html: 'MIRA<span class="dot">·</span>TV' }),
        el('div', { class: 'tabs' }, [...tabEls, exitBtn]),
      ]);

      content = el('div', { class: 'home-content' });
      root.append(el('div', { class: 'screen' }, [topbar, content]));

      tabEls.forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
      void renderContent().then(() => {
        const active = tabEls.find((t) => t.dataset.tab === activeTab);
        if (active && !currentFocus()) focusElement(active);
      });
    },

    onKey(keyCode) {
      if (keyCode === Key.ColorYellow) {
        return toggleCardFavorite(currentFocus());
      }
      return false;
    },
  };
}

function rail(title: string, cards: HTMLElement[]): HTMLElement {
  return el('div', { class: 'rail' }, [
    el('div', { class: 'rail-title', html: title }),
    el(
      'div',
      { class: 'rail-track' },
      cards.length ? cards : [el('div', { class: 'empty', html: 'Sin contenido.' })],
    ),
  ]);
}
