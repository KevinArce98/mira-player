import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ParentalFilter } from '@/db/repositories/content';
import {
  getPreference,
  PREF_PARENTAL_BLOCKED,
  PREF_PARENTAL_ENABLED,
  PREF_PARENTAL_PIN_HASH,
  PREF_PARENTAL_PIN_SALT,
  setPreference,
} from '@/db/repositories/preferences';

interface ParentalValue {
  ready: boolean;
  enabled: boolean;
  blockedCategoryIds: string[];
  filter: ParentalFilter | null;
  enable: (pin: string) => Promise<void>;
  disable: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setBlockedCategories: (ids: string[]) => Promise<void>;
}

const ParentalContext = createContext<ParentalValue | null>(null);

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function parseBlocked(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function ParentalProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [blockedCategoryIds, setBlockedCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedEnabled, storedBlocked] = await Promise.all([
        getPreference(PREF_PARENTAL_ENABLED),
        getPreference(PREF_PARENTAL_BLOCKED),
      ]);
      if (!active) return;
      setEnabled(storedEnabled === '1');
      setBlockedCategoryIds(parseBlocked(storedBlocked));
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ParentalValue>(() => {
    const filter: ParentalFilter | null = enabled ? { blockedCategoryIds } : null;
    return {
      ready,
      enabled,
      blockedCategoryIds,
      filter,
      enable: async (pin) => {
        const salt = Crypto.randomUUID();
        const hash = await hashPin(pin, salt);
        await Promise.all([
          setPreference(PREF_PARENTAL_PIN_SALT, salt),
          setPreference(PREF_PARENTAL_PIN_HASH, hash),
          setPreference(PREF_PARENTAL_ENABLED, '1'),
        ]);
        setEnabled(true);
        qc.invalidateQueries();
      },
      disable: async () => {
        await setPreference(PREF_PARENTAL_ENABLED, null);
        setEnabled(false);
        qc.invalidateQueries();
      },
      verifyPin: async (pin) => {
        const [salt, storedHash] = await Promise.all([
          getPreference(PREF_PARENTAL_PIN_SALT),
          getPreference(PREF_PARENTAL_PIN_HASH),
        ]);
        if (!salt || !storedHash) return false;
        const hash = await hashPin(pin, salt);
        return hash === storedHash;
      },
      setBlockedCategories: async (ids) => {
        await setPreference(PREF_PARENTAL_BLOCKED, JSON.stringify(ids));
        setBlockedCategoryIds(ids);
        qc.invalidateQueries();
      },
    };
  }, [ready, enabled, blockedCategoryIds, qc]);

  return <ParentalContext.Provider value={value}>{children}</ParentalContext.Provider>;
}

export function useParental(): ParentalValue {
  const ctx = useContext(ParentalContext);
  if (!ctx) throw new Error('useParental must be used within ParentalProvider');
  return ctx;
}
