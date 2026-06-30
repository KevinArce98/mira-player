import { useQuery } from '@tanstack/react-query';

import { getEpisodeById } from '@/db/repositories/episodes';
import { getSeriesEpisodeProgress } from '@/db/repositories/progress';
import { queryKeys } from '@/lib/query-client';
import { loadSeriesEpisodes } from '@/services/series';

export function useEpisodes(serieId: string | undefined) {
  return useQuery({
    queryKey: serieId ? queryKeys.episodes(serieId) : ['episodes', 'none'],
    queryFn: () => loadSeriesEpisodes(serieId!),
    enabled: !!serieId,
  });
}

export function useEpisode(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => getEpisodeById(episodeId!),
    enabled: !!episodeId,
  });
}

export function useSeriesProgress(serieId: string | undefined) {
  return useQuery({
    queryKey: ['series-progress', serieId],
    queryFn: () => getSeriesEpisodeProgress(serieId!),
    enabled: !!serieId,
  });
}
