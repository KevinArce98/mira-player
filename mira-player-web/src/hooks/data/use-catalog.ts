import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  countContent,
  listCategories,
  queryContent,
  searchAllContent,
} from '@/db/repositories/content';
import {
  catalogSortPrefKey,
  categoryOrderPrefKey,
  getPreference,
  setPreference,
} from '@/db/repositories/preferences';
import { queryKeys } from '@/lib/query-client';
import { useParental } from '@/providers/parental';
import type { ContentSort, ContentType } from '@/types/models';

const PAGE_SIZE = 40;

function useParentalQuery() {
  const { filter, ready } = useParental();
  const fingerprint = filter ? `p:${filter.blockedCategoryIds.join(',')}` : 'p:off';
  return { filter, ready, fingerprint };
}

export function useCatalog(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
  search?: string,
  sort: ContentSort = 'defecto',
) {
  const trimmed = search?.trim() || undefined;
  const { filter, ready, fingerprint } = useParentalQuery();
  return useInfiniteQuery({
    queryKey: [...queryKeys.catalog(tipo, categoriaId, trimmed, sort), fingerprint],
    queryFn: ({ pageParam = 0 }) =>
      queryContent({
        cuentaId: cuentaId!,
        tipo,
        categoriaId,
        search: trimmed,
        sort,
        limit: PAGE_SIZE,
        offset: pageParam,
        parental: filter,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    enabled: !!cuentaId && ready,
  });
}

export function useCatalogCount(
  cuentaId: string | undefined,
  tipo: ContentType,
  categoriaId?: string,
  search?: string,
) {
  const trimmed = search?.trim() || undefined;
  const { filter, ready, fingerprint } = useParentalQuery();
  return useQuery({
    queryKey: [...queryKeys.catalogCount(tipo, categoriaId, trimmed), fingerprint],
    queryFn: () =>
      countContent({ cuentaId: cuentaId!, tipo, categoriaId, search: trimmed, parental: filter }),
    enabled: !!cuentaId && ready,
  });
}

export function useCategories(cuentaId: string | undefined, tipo: ContentType) {
  const { filter, ready, fingerprint } = useParentalQuery();
  return useQuery({
    queryKey: [...queryKeys.categories(tipo), fingerprint],
    queryFn: () => listCategories(cuentaId!, tipo, filter),
    enabled: !!cuentaId && ready,
  });
}

export function useSearch(cuentaId: string | undefined, term: string) {
  const trimmed = term.trim();
  const { filter, ready, fingerprint } = useParentalQuery();
  return useQuery({
    queryKey: [...queryKeys.search(trimmed), fingerprint],
    queryFn: () => searchAllContent(cuentaId!, trimmed, 50, filter),
    enabled: !!cuentaId && ready && trimmed.length >= 2,
  });
}

const SORT_VALUES: ContentSort[] = [
  'defecto',
  'nombre_asc',
  'nombre_desc',
  'anio_desc',
  'anio_asc',
  'reciente',
];

export function isContentSort(value: string | null): value is ContentSort {
  return value != null && (SORT_VALUES as string[]).includes(value);
}

export function useSortPreference(tipo: ContentType) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['catalog-sort', tipo],
    queryFn: () => getPreference(catalogSortPrefKey(tipo)),
  });
  const mutation = useMutation({
    mutationFn: (sort: ContentSort) => setPreference(catalogSortPrefKey(tipo), sort),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-sort', tipo] }),
  });
  const stored = query.data ?? null;
  return {
    sort: isContentSort(stored) ? stored : ('defecto' as ContentSort),
    setSort: mutation.mutate,
  };
}

export function useCategoryOrder(tipo: ContentType) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['category-order', tipo],
    queryFn: async () => {
      const raw = await getPreference(categoryOrderPrefKey(tipo));
      if (!raw) return [] as string[];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? (parsed.filter((v) => typeof v === 'string') as string[])
          : [];
      } catch {
        return [] as string[];
      }
    },
  });
  const mutation = useMutation({
    mutationFn: (ids: string[]) => setPreference(categoryOrderPrefKey(tipo), JSON.stringify(ids)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category-order', tipo] }),
  });
  return { order: query.data ?? [], setOrder: mutation.mutate };
}

export function applyCategoryOrder<T extends { id: string | undefined }>(
  options: T[],
  order: string[],
): T[] {
  if (order.length === 0) return options;
  const position = new Map(order.map((id, index) => [id, index]));
  return [...options].sort((a, b) => {
    const pa = a.id != null && position.has(a.id) ? position.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const pb = b.id != null && position.has(b.id) ? position.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });
}
