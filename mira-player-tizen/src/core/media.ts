export type MediaKind = 'live' | 'movie' | 'series';

export interface MediaItem {
  kind: MediaKind;
  id: number;
  name: string;
  icon: string | null;
  containerExtension?: string | null;
  searchNorm?: string;
}

export type ResumePayload =
  | { kind: 'live'; streamId: number }
  | { kind: 'movie'; streamId: number; ext: string }
  | {
      kind: 'series';
      episodeId: string;
      ext: string;
      seriesId: number;
      title: string;
      season: number;
      episodeNum: number;
    };

export function progressKey(r: ResumePayload): string {
  if (r.kind === 'series') return `series:${r.seriesId}:${r.season}:${r.episodeNum}`;
  if (r.kind === 'movie') return `movie:${r.streamId}`;
  return `live:${r.streamId}`;
}
