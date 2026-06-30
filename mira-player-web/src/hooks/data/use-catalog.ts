import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  countContent,
  listCategories,
  queryContent,
  searchAllContent,
} from '@/db/repositories/content';
import { queryKeys } from '@/lib/query-client';
import type { ContentSort, ContentType } from '@/types/models';

const PAGE_SIZE = 40;

export function useCatalog(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
  search?: string,
  sort: ContentSort = 'nombre_asc',
) {
  const trimmed = search?.trim() || undefined;
  return useInfiniteQuery({
    queryKey: queryKeys.catalog(tipo, categoriaId, trimmed, sort),
    queryFn: ({ pageParam = 0 }) =>
      queryContent({ cuentaId: cuentaId!, tipo, categoriaId, search: trimmed, sort, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    enabled: !!cuentaId,
  });
}

export function useCatalogCount(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
  search?: string,
) {
  const trimmed = search?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.catalogCount(tipo, categoriaId, trimmed),
    queryFn: () => countContent({ cuentaId: cuentaId!, tipo, categoriaId, search: trimmed }),
    enabled: !!cuentaId,
  });
}

export function useCategories(cuentaId: string | undefined, tipo: ContentType) {
  return useQuery({
    queryKey: queryKeys.categories(tipo),
    queryFn: () => listCategories(cuentaId!, tipo),
    enabled: !!cuentaId,
  });
}

export function useSearch(cuentaId: string | undefined, term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: () => searchAllContent(cuentaId!, trimmed),
    enabled: !!cuentaId && trimmed.length >= 2,
  });
}
