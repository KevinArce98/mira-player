import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createProfile, deleteProfile, listProfiles, renameProfile } from '@/db/repositories/profiles';
import { ensureDefaultProfile, getActiveProfileId, setActiveProfileId } from '@/db/repositories/sync-meta';
import { queryKeys } from '@/lib/query-client';
import { isSyncConfigured } from '@/services/sync/config';
import { requestSync } from '@/services/sync/engine';
import { getSyncSecret } from '@/services/sync/secret-store';
import { deleteProfileRemote, pushProfile } from '@/services/sync/client';

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: listProfiles,
  });
}

export function useActiveProfileId() {
  return useQuery({
    queryKey: queryKeys.activeProfile,
    queryFn: getActiveProfileId,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nombre: string) => {
      const profile = await createProfile({ nombre });
      if (isSyncConfigured()) {
        const secret = await getSyncSecret();
        if (secret) {
          await pushProfile(secret, profile.id, profile.nombre, {
            avatar: profile.avatar,
            isKids: profile.is_kids,
          });
        }
      }
      return profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  });
}

export function useRenameProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const profile = await renameProfile(id, nombre);
      if (isSyncConfigured()) {
        const secret = await getSyncSecret();
        if (secret) {
          await pushProfile(secret, profile.id, profile.nombre, {
            avatar: profile.avatar,
            isKids: profile.is_kids,
          });
        }
      }
      return profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteProfile(id);
      if (isSyncConfigured()) {
        const secret = await getSyncSecret();
        if (secret) {
          await deleteProfileRemote(secret, id).catch(() => undefined);
        }
      }
      await ensureDefaultProfile();
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles });
      qc.invalidateQueries({ queryKey: queryKeys.activeProfile });
    },
  });
}

export function useSwitchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      await setActiveProfileId(profileId);
      return profileId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activeProfile });
      qc.invalidateQueries({ queryKey: queryKeys.continueWatching });
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
      requestSync();
    },
  });
}
