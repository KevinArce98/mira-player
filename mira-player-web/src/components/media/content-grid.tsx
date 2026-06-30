import { useEffect, useRef } from 'react';
import { PosterCard } from './poster-card';
import type { Contenido } from '@/types/models';

export function ContentGrid({
  items,
  onPressItem,
  header,
  empty,
  onLoadMore,
  isFetchingMore = false,
}: {
  items: Contenido[];
  onPressItem: (item: Contenido) => void;
  header?: React.ReactNode;
  empty?: React.ReactNode;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onLoadMore]);

  return (
    <div className="flex-1 overflow-y-auto">
      {header}
      {items.length === 0 ? (
        empty ?? null
      ) : (
        <>
          <div className="p-3 sm:p-4 grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(90px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))]">
            {items.map((item) => (
              <PosterCard
                key={item.id}
                title={item.nombre}
                posterUrl={item.poster_url}
                subtitle={item.categoria}
                onPress={() => onPressItem(item)}
              />
            ))}
          </div>
          {onLoadMore ? (
            <div ref={sentinelRef} className="flex items-center justify-center h-10 pb-4">
              {isFetchingMore ? (
                <div className="w-5 h-5 rounded-full border-2 border-border border-t-tint animate-spin" />
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
