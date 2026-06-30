import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getContentById } from '@/db/repositories/content';
import { isFavorite } from '@/db/repositories/favorites';
import { getProgress, setCompleted } from '@/db/repositories/progress';
import { queryKeys } from '@/lib/query-client';
import { loadContentDetails } from '@/services/content-details';
import type { ContentType } from '@/types/models';

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => getContentById(id!),
    enabled: !!id,
  });
}

export function useContentDetails(contentId: string | undefined, tipo: ContentType | undefined) {
  return useQuery({
    queryKey: ['content-details', contentId],
    queryFn: () => loadContentDetails(contentId!),
    enabled: !!contentId && tipo != null && tipo !== 'live',
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useIsFavorite(contentId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.favorites, contentId],
    queryFn: () => isFavorite(contentId!),
    enabled: !!contentId,
  });
}

export function useProgressFor(contentId: string | undefined, episodeId: string | null = null) {
  return useQuery({
    queryKey: ['progress', contentId, episodeId],
    queryFn: () => getProgress(contentId!, episodeId),
    enabled: !!contentId,
  });
}

export function useSetCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      completado,
      episodeId = null,
    }: {
      contentId: string;
      completado: boolean;
      episodeId?: string | null;
    }) => setCompleted(contentId, completado, episodeId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progress', vars.contentId, vars.episodeId ?? null] });
      qc.invalidateQueries({ queryKey: ['series-progress', vars.contentId] });
      qc.invalidateQueries({ queryKey: queryKeys.continueWatching });
    },
  });
}
