import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAccount, getAccount, saveAccount, saveDemoAccount } from '@/db/repositories/accounts';
import { queryKeys } from '@/lib/query-client';
import { isDemoAccount, syncDemoCatalog } from '@/services/demo';
import { isReauthPending } from '@/services/session-reauth';
import { clientFromAccount } from '@/services/xtream/from-account';
import { XtreamClient } from '@/services/xtream/client';
import type { XtreamUserInfo } from '@/types/xtream';

const STATUS_TTL_MS = 30 * 60 * 1000;

const REAUTH_QUERY_KEY = ['reauth-pending'] as const;

export function useAccount() {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: getAccount,
  });
}

export function useReauthPending() {
  return useQuery({
    queryKey: REAUTH_QUERY_KEY,
    queryFn: isReauthPending,
  });
}

export function useAccountStatus() {
  return useQuery<XtreamUserInfo | null>({
    queryKey: ['account-status'],
    queryFn: async () => {
      const cuenta = await getAccount();
      if (!cuenta || isDemoAccount(cuenta)) return null;
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
      qc.invalidateQueries({ queryKey: REAUTH_QUERY_KEY });
    },
  });
}

export function useSaveDemoAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const cuenta = await saveDemoAccount();
      await syncDemoCatalog(cuenta);
      return cuenta;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account });
      qc.invalidateQueries({ queryKey: REAUTH_QUERY_KEY });
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
