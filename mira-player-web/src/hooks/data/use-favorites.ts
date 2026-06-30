import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listFavorites, toggleFavorite } from '@/db/repositories/favorites';
import { queryKeys } from '@/lib/query-client';

export function useFavorites(cuentaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => listFavorites(cuentaId!),
    enabled: !!cuentaId,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => toggleFavorite(contentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}
