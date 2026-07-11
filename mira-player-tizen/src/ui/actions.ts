import { navigate } from '@/core/router';
import { getSession } from '@/core/session';
import { getProgress } from '@/core/progress';
import { getActiveProfileId } from '@/services/sync/sync-meta';
import type { MediaItem, ResumePayload } from '@/core/media';
import { createPlayerScreen } from './player-screen';
import { createDetailScreen } from './detail';

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
  const prog = getProgress(acctKey, resume, getActiveProfileId(acctKey));
  void navigate(() =>
    createPlayerScreen({ title: item.name, media: item, resume, startMs: prog?.positionMs }),
  );
}
