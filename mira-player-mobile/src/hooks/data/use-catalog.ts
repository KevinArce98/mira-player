import { useQuery } from '@tanstack/react-query';

import {
  countContent,
  listCategories,
  queryContent,
  searchAllContent,
} from '@/db/repositories/content';
import { queryKeys } from '@/lib/query-client';
import type { ContentSort, ContentType } from '@/types/models';

export function useCatalog(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
  sort: ContentSort = 'nombre_asc',
) {
  return useQuery({
    queryKey: queryKeys.catalog(tipo, categoriaId, sort),
    queryFn: () => queryContent({ cuentaId: cuentaId!, tipo, categoriaId, sort, limit: 500 }),
    enabled: !!cuentaId,
  });
}

export function useCatalogCount(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
) {
  return useQuery({
    queryKey: queryKeys.catalogCount(tipo, categoriaId),
    queryFn: () => countContent({ cuentaId: cuentaId!, tipo, categoriaId }),
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
