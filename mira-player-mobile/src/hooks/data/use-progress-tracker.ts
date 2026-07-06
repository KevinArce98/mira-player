import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { saveProgress } from '@/db/repositories/progress';
import { runSync } from '@/services/sync/engine';
import { queryKeys } from '@/lib/query-client';

const THROTTLE_MS = 12_000;

export interface ProgressTarget {
  contentId: string;
  episodeId?: string | null;
  duracionTotal?: number | null;
}

export function useProgressTracker(target: ProgressTarget) {
  const qc = useQueryClient();
  const lastWriteRef = useRef(0);
  const pendingPosRef = useRef<number | null>(null);

  const persist = useCallback(
    async (posicionSegundos: number) => {
      await saveProgress({
        contentId: target.contentId,
        episodeId: target.episodeId ?? null,
        posicionSegundos,
        duracionTotal: target.duracionTotal ?? null,
      });
      qc.invalidateQueries({ queryKey: queryKeys.continueWatching });
    },
    [qc, target.contentId, target.episodeId, target.duracionTotal],
  );

  const report = useCallback(
    (posicionSegundos: number) => {
      pendingPosRef.current = posicionSegundos;
      const now = Date.now();
      if (now - lastWriteRef.current >= THROTTLE_MS) {
        lastWriteRef.current = now;
        void persist(posicionSegundos);
      }
    },
    [persist],
  );

  const flush = useCallback(() => {
    if (pendingPosRef.current != null) {
      void persist(pendingPosRef.current).then(() => {
        void runSync();
      });
    }
  }, [persist]);

  useEffect(() => () => flush(), [flush]);

  return { report, flush };
}
