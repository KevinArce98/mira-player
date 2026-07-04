import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CloudOff, Film } from 'lucide-react';
import { ContentGrid } from '@/components/media/content-grid';
import { CatalogToolbar } from '@/components/ui/catalog-toolbar';
import { Empty, Loading } from '@/components/ui/empty';
import { useAccount } from '@/hooks/data/use-account';
import {
  applyCategoryOrder,
  useCatalog,
  useCatalogCount,
  useCategories,
  useCategoryOrder,
  useSortPreference,
} from '@/hooks/data/use-catalog';
import { useDebounced } from '@/hooks/use-debounced';
import { useT } from '@/providers/preferences';
import { getCatalogBrowseState, setCatalogBrowseState } from '@/stores/browse';
import type { TranslationKey } from '@/lib/i18n';
import type { ContentType } from '@/types/models';

export function CatalogPage({
  tipo,
  titleKey,
}: {
  tipo: ContentType;
  titleKey: TranslationKey;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { data: account } = useAccount();
  const accountId = account?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const [categoriaId, setCategoriaId] = useState<string | undefined>(
    () => searchParams.get('cat') ?? getCatalogBrowseState(tipo).categoriaId,
  );
  const [term, setTerm] = useState(
    () => searchParams.get('q') ?? getCatalogBrowseState(tipo).term,
  );
  const { sort, setSort } = useSortPreference(tipo);
  const { order, setOrder } = useCategoryOrder(tipo);

  const debouncedTerm = useDebounced(term);
  const categories = useCategories(accountId, tipo);
  const catalog = useCatalog(accountId, tipo, categoriaId, debouncedTerm, sort);
  const countQuery = useCatalogCount(accountId, tipo, categoriaId, debouncedTerm);

  const items = catalog.data?.pages.flatMap((p) => p) ?? [];
  const isFirstLoad = catalog.isLoading && items.length === 0;
  const handleLoadMore = useCallback(
    () => { void catalog.fetchNextPage(); },
    [catalog.fetchNextPage],
  );

  useEffect(() => {
    const next = new URLSearchParams();
    if (categoriaId) next.set('cat', categoriaId);
    const q = debouncedTerm.trim();
    if (q) next.set('q', q);
    setSearchParams(next, { replace: true });
    setCatalogBrowseState(tipo, { categoriaId, term: debouncedTerm });
  }, [categoriaId, debouncedTerm, tipo, setSearchParams]);

  const options = [
    { id: undefined as string | undefined, label: t('catalog.all') },
    ...applyCategoryOrder(
      (categories.data ?? []).map((c) => ({
        id: c.categoria_id ?? undefined,
        label: c.categoria ?? t('catalog.all'),
      })),
      order,
    ),
  ];

  return (
    <div className="flex flex-col h-full bg-bg">
      <CatalogToolbar
        title={t(titleKey)}
        count={countQuery.data}
        searchValue={term}
        onSearchChange={setTerm}
        searchPlaceholder={t('catalog.search')}
        categories={options}
        selectedId={categoriaId}
        onSelectCategory={setCategoriaId}
        categoryPlaceholder={t('catalog.category')}
        sort={sort}
        onSortChange={setSort}
        onReorderCategories={setOrder}
      />

      {isFirstLoad ? (
        <Loading />
      ) : (
        <ContentGrid
          items={items}
          onPressItem={(item) => void navigate(`/content/${item.id}`)}
          onLoadMore={catalog.hasNextPage ? handleLoadMore : undefined}
          isFetchingMore={catalog.isFetchingNextPage}
          empty={
            catalog.isError ? (
              <Empty
                icon={CloudOff}
                title={t('error.loadFailed.title')}
                subtitle={t('error.loadFailed.subtitle')}
              />
            ) : (
              <Empty
                icon={Film}
                title={t('catalog.empty.title')}
                subtitle={t('catalog.empty.subtitle')}
              />
            )
          }
        />
      )}
    </div>
  );
}
