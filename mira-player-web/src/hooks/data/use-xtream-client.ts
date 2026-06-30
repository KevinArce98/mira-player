import { useQuery } from '@tanstack/react-query';

import { getAccount } from '@/db/repositories/accounts';
import { clientFromAccount } from '@/services/xtream/from-account';
import type { XtreamClient } from '@/services/xtream/client';

export function useXtreamClient() {
  return useQuery<XtreamClient | null>({
    queryKey: ['xtream-client'],
    queryFn: async () => {
      const cuenta = await getAccount();
      if (!cuenta) return null;
      return clientFromAccount(cuenta);
    },
    staleTime: Infinity,
  });
}
