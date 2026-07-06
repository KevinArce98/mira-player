export interface ProgressFields {
  posicionSegundos: number;
  duracionTotal: number | null;
  completado: boolean;
  lastWatchedAt: number;
  deletedAt: number | null;
}

export interface ProgressIncoming extends ProgressFields {
  reset?: boolean;
}

export function mergeProgress(
  current: ProgressFields | null,
  incoming: ProgressIncoming,
): ProgressFields {
  if (incoming.reset) {
    return {
      posicionSegundos: 0,
      duracionTotal: incoming.duracionTotal ?? current?.duracionTotal ?? null,
      completado: false,
      lastWatchedAt: Math.max(current?.lastWatchedAt ?? 0, incoming.lastWatchedAt),
      deletedAt: null,
    };
  }
  if (!current) {
    return {
      posicionSegundos: incoming.posicionSegundos,
      duracionTotal: incoming.duracionTotal,
      completado: incoming.completado,
      lastWatchedAt: incoming.lastWatchedAt,
      deletedAt: incoming.deletedAt,
    };
  }
  return {
    posicionSegundos: Math.max(current.posicionSegundos, incoming.posicionSegundos),
    duracionTotal: incoming.duracionTotal ?? current.duracionTotal,
    completado: current.completado || incoming.completado,
    lastWatchedAt: Math.max(current.lastWatchedAt, incoming.lastWatchedAt),
    deletedAt: resolveTombstone(current.deletedAt, incoming.deletedAt, current.lastWatchedAt, incoming.lastWatchedAt),
  };
}

export interface FavoriteFields {
  createdAt: number;
  deletedAt: number | null;
}

export function mergeFavorite(
  current: FavoriteFields | null,
  incoming: FavoriteFields,
): FavoriteFields {
  if (!current) return { createdAt: incoming.createdAt, deletedAt: incoming.deletedAt };
  return {
    createdAt: Math.min(current.createdAt || incoming.createdAt, incoming.createdAt || current.createdAt),
    deletedAt: resolveTombstone(current.deletedAt, incoming.deletedAt, current.createdAt, incoming.createdAt),
  };
}

export interface PreferenceFields {
  valor: string | null;
  clientUpdatedAt: number;
  deletedAt: number | null;
}

export function mergePreference(
  current: PreferenceFields | null,
  incoming: PreferenceFields,
): PreferenceFields {
  if (!current) return incoming;
  if (incoming.clientUpdatedAt >= current.clientUpdatedAt) return incoming;
  return current;
}

function resolveTombstone(
  currentDeleted: number | null,
  incomingDeleted: number | null,
  currentTs: number,
  incomingTs: number,
): number | null {
  if (currentDeleted == null && incomingDeleted == null) return null;
  if (incomingTs >= currentTs) return incomingDeleted;
  return currentDeleted;
}
