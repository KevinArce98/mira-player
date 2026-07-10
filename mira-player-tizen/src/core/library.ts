import type { XtreamClient } from './xtream-client';
import type { XtreamCategory } from '@/types/xtream';
import type { MediaItem, MediaKind } from './media';
import { isAdultCategoryName, isAdultEnabled } from './parental';
import { normalizeSearchText } from './search-text';

// Capa sobre XtreamClient: normaliza a MediaItem y cachea categorías y listados
// para no repetir peticiones al moverse por el catálogo o al buscar.
export class Library {
  private catCache = new Map<MediaKind, Promise<XtreamCategory[]>>();
  private contentCache = new Map<string, Promise<MediaItem[]>>();
  private allCache = new Map<MediaKind, Promise<MediaItem[]>>();

  constructor(private readonly client: XtreamClient) {}

  // Categorías sin filtrar (uso interno, para poder detectar cuáles son de
  // contenido adulto aunque estén ocultas por control parental).
  private rawCategories(kind: MediaKind): Promise<XtreamCategory[]> {
    let p = this.catCache.get(kind);
    if (!p) {
      p =
        kind === 'live'
          ? this.client.liveCategories()
          : kind === 'movie'
            ? this.client.vodCategories()
            : this.client.seriesCategories();
      this.catCache.set(kind, p);
    }
    return p;
  }

  // Control parental: el contenido adulto está oculto por defecto.
  private async adultCategoryIds(kind: MediaKind): Promise<Set<string>> {
    if (isAdultEnabled()) return new Set();
    const cats = await this.rawCategories(kind);
    return new Set(
      cats.filter((c) => isAdultCategoryName(c.category_name)).map((c) => c.category_id),
    );
  }

  async categories(kind: MediaKind): Promise<XtreamCategory[]> {
    const cats = await this.rawCategories(kind);
    if (isAdultEnabled()) return cats;
    return cats.filter((c) => !isAdultCategoryName(c.category_name));
  }

  // Limpia toda la caché; hay que llamarlo si cambia el ajuste de control
  // parental para que el catálogo se recalcule con el nuevo filtro.
  clearCache(): void {
    this.catCache.clear();
    this.contentCache.clear();
    this.allCache.clear();
  }

  content(kind: MediaKind, categoryId?: string): Promise<MediaItem[]> {
    const cacheId = `${kind}:${categoryId ?? 'all'}`;
    let p = this.contentCache.get(cacheId);
    if (!p) {
      p = this.fetchContent(kind, categoryId);
      this.contentCache.set(cacheId, p);
    }
    return p;
  }

  private async fetchContent(kind: MediaKind, categoryId?: string): Promise<MediaItem[]> {
    const blocked = await this.adultCategoryIds(kind);
    if (categoryId && blocked.has(categoryId)) return [];
    if (kind === 'live') {
      const list = await this.client.liveStreams(categoryId);
      return list
        .filter((s) => !s.category_id || !blocked.has(s.category_id))
        .map((s) => ({
          kind,
          id: s.stream_id,
          name: s.name,
          icon: s.stream_icon,
          searchNorm: normalizeSearchText(s.name),
        }));
    }
    if (kind === 'movie') {
      const list = await this.client.vodStreams(categoryId);
      return list
        .filter((m) => !m.category_id || !blocked.has(m.category_id))
        .map((m) => ({
          kind,
          id: m.stream_id,
          name: m.name,
          icon: m.stream_icon,
          containerExtension: m.container_extension,
          searchNorm: normalizeSearchText(m.name),
        }));
    }
    const list = await this.client.series(categoryId);
    return list
      .filter((s) => !s.category_id || !blocked.has(s.category_id))
      .map((s) => ({
        kind,
        id: s.series_id,
        name: s.name,
        icon: s.cover,
        searchNorm: normalizeSearchText(s.name),
      }));
  }

  // Listado completo de un tipo (sin categoría), cacheado para búsqueda.
  all(kind: MediaKind): Promise<MediaItem[]> {
    let p = this.allCache.get(kind);
    if (!p) {
      p = this.fetchContent(kind);
      this.allCache.set(kind, p);
    }
    return p;
  }

  async search(query: string): Promise<MediaItem[]> {
    const q = normalizeSearchText(query.trim());
    if (!q) return [];
    const [live, movies, series] = await Promise.all([
      this.all('live'),
      this.all('movie'),
      this.all('series'),
    ]);
    return [...movies, ...series, ...live]
      .filter((i) => (i.searchNorm ?? normalizeSearchText(i.name)).includes(q))
      .slice(0, 120);
  }
}
