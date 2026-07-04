import { loadAccount, clearAccount } from '@/core/store';
import { initSession, clearSession } from '@/core/session';
import { focusFirst, focusElement, currentFocus } from '@/core/navigation';
import { navigate, reset } from '@/core/router';
import type { Screen } from '@/core/router';
import { Key } from '@/core/keys';
import type { MediaItem, MediaKind } from '@/core/media';
import { continueWatching, removeProgress, type ProgressEntry } from '@/core/progress';
import { listFavorites } from '@/core/favorites';
import { loadParental, setAdultEnabled, setPin } from '@/core/parental';
import { getCategoryOrder, setCategoryOrder, applyCategoryOrder } from '@/core/category-order';
import { el } from './dom';
import { mediaCard, continueCard, toggleCardFavorite, escapeHtml } from './cards';
import { openMedia } from './actions';
import { createPlayerScreen } from './player-screen';
import { createDetailScreen } from './detail';
import { createSetupScreen } from './setup';

type Tab = 'home' | 'live' | 'movies' | 'series' | 'search' | 'settings';

const ICONS: Record<Tab | 'exit', string> = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 21h8"/></svg>',
  movies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18"/><path d="M7 5l3 4M13 5l3 4"/></svg>',
  series: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'live', label: 'En vivo' },
  { id: 'movies', label: 'Películas' },
  { id: 'series', label: 'Series' },
  { id: 'search', label: 'Buscar' },
  { id: 'settings', label: 'Ajustes' },
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

  // Estado de navegación que sobrevive a volver del reproductor (misma
  // instancia de HomeScreen, solo se vuelve a invocar render()).
  let lastSearchTerm = '';
  const lastCategoryByKind: Partial<Record<MediaKind, string | undefined>> = {};
  let focusCategoryOverride: string | undefined;
  let moveCategoryFn: ((catId: string, delta: -1 | 1) => void) | undefined;

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
      else if (activeTab === 'settings') renderSettings();
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

  // Título limpio para el hero: si viene de "continuar viendo" una serie,
  // el nombre guardado es "Serie — Episodio"; nos quedamos solo con la serie.
  function heroTitle(item: MediaItem): string {
    if (item.kind === 'series') return item.name.split(' — ')[0] || item.name;
    return item.name;
  }

  function renderHero(watching: ProgressEntry[], fallback: MediaItem | undefined): HTMLElement | null {
    const entry = watching[0];
    const item = entry?.item ?? fallback;
    if (!item) return null;

    const playBtn = el('button', { class: 'btn focusable hero-btn', html: '▶ Reproducir' });
    const infoBtn = el('button', {
      class: 'btn-secondary btn focusable hero-btn',
      html: 'ℹ Más info',
    });

    function doPlay(): void {
      if (entry) resumeEntry(entry);
      else openMedia(item!);
    }
    playBtn.addEventListener('click', doPlay);
    infoBtn.addEventListener('click', () => {
      if (item!.kind === 'series') void navigate(() => createDetailScreen(item!));
      else doPlay();
    });

    const bg = item.icon
      ? `background-image:linear-gradient(to right, var(--bg) 20%, rgba(39,39,39,0.55) 55%, rgba(39,39,39,0.1)), url('${item.icon}')`
      : '';

    return el('div', { class: 'hero', style: bg }, [
      el('div', { class: 'hero-content' }, [
        el('div', { class: 'hero-tag', html: entry ? 'Continuar viendo' : 'Destacado' }),
        el('div', { class: 'hero-title', html: escapeHtml(heroTitle(item)) }),
        el('div', { class: 'hero-actions' }, [playBtn, infoBtn]),
      ]),
    ]);
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
    const hero = renderHero(watching, movies[0] ?? series[0] ?? live[0]);
    if (hero) content.append(hero);

    if (watching.length) {
      content.append(
        rail(
          'Continuar viendo',
          watching.map((e) =>
            continueCard(
              e,
              () => resumeEntry(e),
              () => {
                removeProgress(acctKey, e.resume);
                void renderHome();
              },
            ),
          ),
        ),
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
    const rawCats = await library.categories(kind);
    const order = getCategoryOrder(acctKey, kind);
    const cats = applyCategoryOrder(rawCats, order);
    content.innerHTML = '';
    const grid = el('div', { class: 'cat-grid screen-scroll' });

    async function loadCategory(catId: string | undefined, button: HTMLElement): Promise<void> {
      content.querySelectorAll('.cat-item').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      lastCategoryByKind[kind] = catId;
      grid.innerHTML = '<div class="loading">Cargando…</div>';
      const items = await library.content(kind, catId);
      grid.innerHTML = '';
      if (!items.length) {
        grid.append(el('div', { class: 'empty', html: 'Sin contenido.' }));
        return;
      }
      grid.append(el('div', { class: 'grid' }, items.map((it) => mediaCard(it, () => openMedia(it)))));
    }

    // Reordenar categorías (rojo/verde), con persistencia por cuenta. Solo
    // mueve el orden y el foco; no cambia la categoría de contenido activa.
    function moveCategory(catId: string, delta: -1 | 1): void {
      const ids = cats.map((c) => c.category_id);
      const from = ids.indexOf(catId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= ids.length) return;
      const nextIds = [...ids];
      nextIds.splice(from, 1);
      nextIds.splice(to, 0, catId);
      setCategoryOrder(acctKey, kind, nextIds);
      focusCategoryOverride = catId;
      void renderCatalog(kind);
    }
    moveCategoryFn = moveCategory;

    const hint = el('div', {
      class: 'cat-hint',
      html: 'Rojo/Verde: mover categoría',
    });

    const focusCatId = focusCategoryOverride ?? lastCategoryByKind[kind];
    focusCategoryOverride = undefined;

    const list = el('div', { class: 'cat-list screen-scroll' });
    let activeButton: HTMLElement | undefined;
    let focusButton: HTMLElement | undefined;
    cats.forEach((c) => {
      const button = el('div', { class: 'cat-item focusable', html: escapeHtml(c.category_name) });
      button.dataset.catId = c.category_id;
      button.addEventListener('click', () => void loadCategory(c.category_id, button));
      list.append(button);
      if (c.category_id === lastCategoryByKind[kind]) activeButton = button;
      if (c.category_id === focusCatId) focusButton = button;
    });

    content.append(el('div', { class: 'catalog' }, [el('div', { class: 'cat-col' }, [hint, list]), grid]));

    const initial = activeButton ?? list.querySelector<HTMLElement>('.cat-item') ?? undefined;
    if (initial) {
      initial.classList.add('active');
      void loadCategory(initial.dataset.catId, initial);
    }
    focusElement(focusButton ?? initial ?? null);
  }

  function renderSearch(): void {
    content.innerHTML = '';
    const input = el('input', {
      class: 'focusable search-input',
      type: 'text',
      placeholder: 'Buscar películas, series o canales…',
    });
    input.value = lastSearchTerm;
    const results = el('div', { class: 'cat-grid screen-scroll' });

    async function run(): Promise<void> {
      const q = input.value.trim();
      lastSearchTerm = q;
      if (!q) {
        results.innerHTML = '';
        return;
      }
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
    if (lastSearchTerm) void run();
  }

  function renderSettings(): void {
    content.innerHTML = '';
    const settings = loadParental();
    const msg = el('div', { class: 'error-banner', html: '' });
    msg.style.display = 'none';

    function showMsg(text: string, ok = false): void {
      msg.textContent = text;
      msg.style.display = 'block';
      msg.style.borderColor = ok ? 'var(--tint)' : 'var(--danger)';
      msg.style.color = ok ? 'var(--tint)' : 'var(--danger)';
    }

    const statusRow = el('div', { class: 'settings-row' }, [
      el('div', { class: 'settings-label', html: 'Contenido para adultos' }),
      el('div', {
        class: 'settings-value',
        html: settings.adultEnabled ? 'Activado' : 'Desactivado (por defecto)',
      }),
    ]);

    const toggleBtn = el('button', {
      class: 'focusable btn',
      html: settings.adultEnabled ? 'Desactivar' : 'Activar',
    });

    const pinInput = el('input', {
      class: 'focusable',
      type: 'password',
      inputMode: 'numeric',
      maxLength: 4,
      placeholder: 'PIN (4 dígitos)',
    });

    toggleBtn.addEventListener('click', () => {
      if (loadParental().adultEnabled) {
        setAdultEnabled(false);
        session.library.clearCache();
        renderSettings();
        return;
      }
      if (!setAdultEnabled(true, pinInput.value.trim())) {
        showMsg('PIN incorrecto.');
        return;
      }
      session.library.clearCache();
      renderSettings();
    });

    const curPinInput = el('input', {
      class: 'focusable',
      type: 'password',
      inputMode: 'numeric',
      maxLength: 4,
      placeholder: 'PIN actual',
    });
    const newPinInput = el('input', {
      class: 'focusable',
      type: 'password',
      inputMode: 'numeric',
      maxLength: 4,
      placeholder: 'PIN nuevo (4 dígitos)',
    });
    const changePinBtn = el('button', { class: 'focusable btn', html: 'Cambiar PIN' });
    changePinBtn.addEventListener('click', () => {
      const np = newPinInput.value.trim();
      if (!/^\d{4}$/.test(np)) {
        showMsg('El PIN nuevo debe tener 4 dígitos.');
        return;
      }
      if (!setPin(np, curPinInput.value.trim())) {
        showMsg('PIN actual incorrecto.');
        return;
      }
      curPinInput.value = '';
      newPinInput.value = '';
      showMsg('PIN actualizado.', true);
    });

    const rows: (HTMLElement | string)[] = [statusRow, msg];
    if (!settings.adultEnabled) {
      rows.push(el('div', { class: 'field' }, [el('label', { html: 'PIN para activar' }), pinInput]));
    }
    rows.push(
      el('div', { class: 'field' }, [toggleBtn]),
      el('div', { class: 'settings-divider' }),
      el('div', { class: 'settings-label', html: 'Cambiar PIN (por defecto: 0000)' }),
      el('div', { class: 'field' }, [curPinInput]),
      el('div', { class: 'field' }, [newPinInput]),
      el('div', { class: 'field' }, [changePinBtn]),
    );

    content.append(el('div', { class: 'settings-card' }, rows));
    focusFirst(content);
  }

  return {
    render(root) {
      const tabEls = TABS.map((t) => {
        const item = el('div', {
          class: 'side-item focusable',
          html: `<span class="side-icon">${ICONS[t.id]}</span><span class="side-label">${t.label}</span>`,
        });
        item.dataset.tab = t.id;
        item.addEventListener('click', () => selectTab(t.id, tabEls));
        return item;
      });
      const exitBtn = el('div', {
        class: 'side-item side-exit focusable',
        html: `<span class="side-icon">${ICONS.exit}</span><span class="side-label">Salir</span>`,
      });
      exitBtn.addEventListener('click', () => {
        clearAccount();
        clearSession();
        void reset(createSetupScreen);
      });

      const sidebar = el('div', { class: 'sidebar' }, [
        el('div', { class: 'side-brand', html: 'M' }),
        el('div', { class: 'side-nav' }, tabEls),
        exitBtn,
      ]);

      content = el('div', { class: 'main-area' });
      root.append(el('div', { class: 'home-screen' }, [sidebar, content]));

      tabEls.forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
      void renderContent().then(() => {
        const active = tabEls.find((t) => t.dataset.tab === activeTab);
        if (active && !currentFocus()) focusElement(active);
      });
    },

    onKey(keyCode) {
      const focused = currentFocus();
      const catId = focused?.classList.contains('cat-item') ? focused.dataset.catId : undefined;
      if (catId && moveCategoryFn) {
        if (keyCode === Key.ColorRed) {
          moveCategoryFn(catId, -1);
          return true;
        }
        if (keyCode === Key.ColorGreen) {
          moveCategoryFn(catId, 1);
          return true;
        }
      }
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
