import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Tv, CloudOff } from 'lucide-react';
import { ChannelRow } from '@/components/media/channel-row';
import { CatalogToolbar } from '@/components/ui/catalog-toolbar';
import { Empty, Loading } from '@/components/ui/empty';
import { useAccount } from '@/hooks/data/use-account';
import {
  applyCategoryOrder,
  useCatalog,
  useCategories,
  useCategoryOrder,
  useSortPreference,
} from '@/hooks/data/use-catalog';
import { useDebounced } from '@/hooks/use-debounced';
import { useT } from '@/providers/preferences';
import { getCatalogBrowseState, setCatalogBrowseState } from '@/stores/browse';

export function LivePage() {
  const t = useT();
  const navigate = useNavigate();
  const { data: account } = useAccount();
  const accountId = account?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoriaId, setCategoriaId] = useState<string | undefined>(
    () => searchParams.get('cat') ?? getCatalogBrowseState('live').categoriaId,
  );
  const [term, setTerm] = useState(
    () => searchParams.get('q') ?? getCatalogBrowseState('live').term,
  );
  const { sort, setSort } = useSortPreference('live');
  const { order, setOrder } = useCategoryOrder('live');
  const debouncedTerm = useDebounced(term);
  const categories = useCategories(accountId, 'live');
  const channels = useCatalog(accountId, 'live', categoriaId, debouncedTerm, sort);

  useEffect(() => {
    const next = new URLSearchParams();
    if (categoriaId) next.set('cat', categoriaId);
    const q = debouncedTerm.trim();
    if (q) next.set('q', q);
    setSearchParams(next, { replace: true });
    setCatalogBrowseState('live', { categoriaId, term: debouncedTerm });
  }, [categoriaId, debouncedTerm, setSearchParams]);

  const options = [
    { id: undefined as string | undefined, label: t('live.all') },
    ...applyCategoryOrder(
      (categories.data ?? []).map((c) => ({
        id: c.categoria_id ?? undefined,
        label: c.categoria ?? t('live.all'),
      })),
      order,
    ),
  ];

  return (
    <div className="flex flex-col h-full bg-bg">
      <CatalogToolbar
        title={t('live.title')}
        searchValue={term}
        onSearchChange={setTerm}
        searchPlaceholder={t('live.search')}
        categories={options}
        selectedId={categoriaId}
        onSelectCategory={setCategoriaId}
        categoryPlaceholder={t('catalog.category')}
        sort={sort}
        onSortChange={setSort}
        onReorderCategories={setOrder}
      />

      <div className="flex-1 overflow-y-auto">
        {channels.isLoading ? (
          <Loading />
        ) : (() => {
            const items = channels.data?.pages.flatMap((p) => p) ?? [];
            if (items.length === 0) {
              return channels.isError ? (
                <Empty
                  icon={CloudOff}
                  title={t('error.loadFailed.title')}
                  subtitle={t('error.loadFailed.subtitle')}
                />
              ) : (
                <Empty
                  icon={Tv}
                  title={t('live.empty.title')}
                  subtitle={t('live.empty.subtitle')}
                />
              );
            }
            return items.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                onPress={() => void navigate(`/player?contentId=${ch.id}`)}
              />
            ));
          })()
        }
      </div>
    </div>
  );
}
