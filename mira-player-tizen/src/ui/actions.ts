import { navigate } from '@/core/router';
import { getSession } from '@/core/session';
import { getProgress } from '@/core/progress';
import type { MediaItem, ResumePayload } from '@/core/media';
import { createPlayerScreen } from './player-screen';
import { createDetailScreen } from './detail';

// Punto de entrada al seleccionar un item: las series abren detalle; el resto
// reproduce directo, reanudando si hay progreso guardado.
export function openMedia(item: MediaItem): void {
  if (item.kind === 'series') {
    void navigate(() => createDetailScreen(item));
    return;
  }
  const resume: ResumePayload =
    item.kind === 'live'
      ? { kind: 'live', streamId: item.id }
      : { kind: 'movie', streamId: item.id, ext: item.containerExtension || 'mp4' };
  const { acctKey } = getSession();
  const prog = getProgress(acctKey, resume);
  void navigate(() =>
    createPlayerScreen({ title: item.name, media: item, resume, startMs: prog?.positionMs }),
  );
}
