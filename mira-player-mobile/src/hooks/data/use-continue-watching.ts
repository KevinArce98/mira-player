import { useQuery } from '@tanstack/react-query';

import { getContinueWatching } from '@/db/repositories/progress';
import { queryKeys } from '@/lib/query-client';

export function useContinueWatching(cuentaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.continueWatching,
    queryFn: () => getContinueWatching(cuentaId!),
    enabled: !!cuentaId,
  });
}
