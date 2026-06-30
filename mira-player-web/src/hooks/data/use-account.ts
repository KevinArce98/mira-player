import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAccount, getAccount, saveAccount } from '@/db/repositories/accounts';
import { queryKeys } from '@/lib/query-client';
import { clientFromAccount } from '@/services/xtream/from-account';
import { XtreamClient } from '@/services/xtream/client';
import type { XtreamUserInfo } from '@/types/xtream';

const STATUS_TTL_MS = 30 * 60 * 1000;

export function useAccount() {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: getAccount,
  });
}

export function useAccountStatus() {
  return useQuery<XtreamUserInfo | null>({
    queryKey: ['account-status'],
    queryFn: async () => {
      const cuenta = await getAccount();
      if (!cuenta) return null;
      const client = await clientFromAccount(cuenta);
      const auth = await client.authenticate();
      return auth.user_info;
    },
    staleTime: STATUS_TTL_MS,
    retry: false,
  });
}

export interface SaveAccountInput {
  servidor: string;
  usuario: string;
  password: string;
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveAccountInput) => {
      const client = new XtreamClient({
        server: input.servidor,
        username: input.usuario,
        password: input.password,
      });
      await client.authenticate();
      return saveAccount(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId),
    onSuccess: () => qc.invalidateQueries(),
  });
}
