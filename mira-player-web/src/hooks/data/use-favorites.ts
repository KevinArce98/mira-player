import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listFavorites, toggleFavorite } from '@/db/repositories/favorites';
import { queryKeys } from '@/lib/query-client';
import { useParental } from '@/providers/parental';
import { requestSync } from '@/services/sync/engine';

export function useFavorites(cuentaId: string | undefined) {
  const { filter, ready } = useParental();
  const fingerprint = filter ? `p:${filter.blockedCategoryIds.join(',')}` : 'p:off';
  return useQuery({
    queryKey: [...queryKeys.favorites, fingerprint],
    queryFn: () => listFavorites(cuentaId!, filter),
    enabled: !!cuentaId && ready,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => toggleFavorite(contentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
      requestSync();
    },
  });
}
