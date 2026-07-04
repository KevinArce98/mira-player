import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Frown } from 'lucide-react';
import { ContentGrid } from '@/components/media/content-grid';
import { Empty, Loading } from '@/components/ui/empty';
import { useAccount } from '@/hooks/data/use-account';
import { useSearch } from '@/hooks/data/use-catalog';
import { useT } from '@/providers/preferences';
import { getGlobalSearchTerm, setGlobalSearchTerm } from '@/stores/browse';

export function SearchPage() {
  const t = useT();
  const navigate = useNavigate();
  const { data: account } = useAccount();

  const [term, setTerm] = useState(getGlobalSearchTerm);
  const [debounced, setDebounced] = useState(getGlobalSearchTerm);

  useEffect(() => {
    setGlobalSearchTerm(term);
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const results = useSearch(account?.id, debounced);
  const hasQuery = debounced.trim().length >= 2;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface border border-border">
          <Search size={16} className="text-muted shrink-0" />
          <input
            type="search"
            placeholder={t('search.placeholder')}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-fg"
          />
        </div>
      </div>

      {!hasQuery ? (
        <Empty
          icon={Search}
          title={t('search.prompt.title')}
          subtitle={t('search.prompt.subtitle')}
        />
      ) : results.isLoading ? (
        <Loading />
      ) : (
        <ContentGrid
          items={results.data ?? []}
          onPressItem={(item) =>
            void navigate(item.tipo === 'live' ? `/player?contentId=${item.id}` : `/content/${item.id}`)
          }
          empty={
            <Empty
              icon={Frown}
              title={t('search.noResults.title')}
              subtitle={t('search.noResults.subtitle', { query: debounced })}
            />
          }
        />
      )}
    </div>
  );
}
