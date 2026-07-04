import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteProgress, getContinueWatching } from '@/db/repositories/progress';
import { queryKeys } from '@/lib/query-client';
import { useParental } from '@/providers/parental';

export function useContinueWatching(cuentaId: string | undefined) {
  const { filter, ready } = useParental();
  const fingerprint = filter ? `p:${filter.blockedCategoryIds.join(',')}` : 'p:off';
  return useQuery({
    queryKey: [...queryKeys.continueWatching, fingerprint],
    queryFn: () => getContinueWatching(cuentaId!, 20, filter),
    enabled: !!cuentaId && ready,
  });
}

export function useRemoveContinueWatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (progresoId: string) => deleteProgress(progresoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.continueWatching }),
  });
}
