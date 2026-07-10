import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccount } from '@/db/repositories/accounts';
import { syncCatalog, type SyncProgress } from '@/services/sync';
import { runSync } from '@/services/sync/engine';
import type { Cuenta } from '@/types/models';

const AUTO_SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function useSyncCatalog() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async (cuenta: Cuenta) => {
      setProgress({ stage: 'live', written: 0 });
      const total = await syncCatalog(cuenta, setProgress);
      await runSync();
      return total;
    },
    onSettled: () => {
      qc.invalidateQueries();
    },
  });

  return { ...mutation, progress };
}

export function useAutoSync() {
  const sync = useSyncCatalog();
  const checkedRef = useRef(false);
  const { mutate, isPending } = sync;

  const maybeSync = useCallback(async () => {
    const cuenta = await getAccount();
    if (!cuenta) return;
    const age = cuenta.ultima_sincronizacion ? Date.now() - cuenta.ultima_sincronizacion : Infinity;
    if (age > AUTO_SYNC_MAX_AGE_MS && !isPending) {
      mutate(cuenta);
    }
  }, [mutate, isPending]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    void maybeSync();
  }, [maybeSync]);

  return sync;
}
