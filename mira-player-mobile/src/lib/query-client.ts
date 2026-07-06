import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  account: ['account'] as const,
  catalog: (tipo: string, categoriaId?: string, sort?: string) =>
    ['catalog', tipo, categoriaId ?? 'all', sort ?? 'nombre_asc'] as const,
  catalogCount: (tipo: string, categoriaId?: string) =>
    ['catalog-count', tipo, categoriaId ?? 'all'] as const,
  categories: (tipo: string) => ['categories', tipo] as const,
  search: (term: string) => ['search', term] as const,
  continueWatching: ['continue-watching'] as const,
  favorites: ['favorites'] as const,
  profiles: ['profiles'] as const,
  activeProfile: ['active-profile'] as const,
  episodes: (serieId: string) => ['episodes', serieId] as const,
  epg: (streamId: number) => ['epg', streamId] as const,
} as const;
