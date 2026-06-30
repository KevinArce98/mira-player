import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useXtreamClient } from './use-xtream-client';

const EPG_TTL_MS = 20 * 60 * 1000;

export function useNowNext(streamId: number, enabled = true) {
  const { data: client } = useXtreamClient();
  return useQuery({
    queryKey: queryKeys.epg(streamId),
    queryFn: ({ signal }) => client!.shortEpg(streamId, signal),
    enabled: enabled && !!client,
    staleTime: EPG_TTL_MS,
    gcTime: EPG_TTL_MS,
    retry: false,
  });
}
