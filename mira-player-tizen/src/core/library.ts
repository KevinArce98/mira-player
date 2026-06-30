import type { XtreamClient } from './xtream-client';
import type { XtreamCategory } from '@/types/xtream';
import type { MediaItem, MediaKind } from './media';

// Capa sobre XtreamClient: normaliza a MediaItem y cachea categorías y listados
// para no repetir peticiones al moverse por el catálogo o al buscar.
export class Library {
  private catCache = new Map<MediaKind, Promise<XtreamCategory[]>>();
  private contentCache = new Map<string, Promise<MediaItem[]>>();
  private allCache = new Map<MediaKind, Promise<MediaItem[]>>();

  constructor(private readonly client: XtreamClient) {}

  categories(kind: MediaKind): Promise<XtreamCategory[]> {
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
    if (kind === 'live') {
      const list = await this.client.liveStreams(categoryId);
      return list.map((s) => ({ kind, id: s.stream_id, name: s.name, icon: s.stream_icon }));
    }
    if (kind === 'movie') {
      const list = await this.client.vodStreams(categoryId);
      return list.map((m) => ({
        kind,
        id: m.stream_id,
        name: m.name,
        icon: m.stream_icon,
        containerExtension: m.container_extension,
      }));
    }
    const list = await this.client.series(categoryId);
    return list.map((s) => ({ kind, id: s.series_id, name: s.name, icon: s.cover }));
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
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const [live, movies, series] = await Promise.all([
      this.all('live'),
      this.all('movie'),
      this.all('series'),
    ]);
    return [...movies, ...series, ...live]
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice(0, 120);
  }
}
