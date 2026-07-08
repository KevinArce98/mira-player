import { PosterCard } from './poster-card';

export interface RailItem {
  key: string;
  title: string;
  posterUrl?: string | null;
  subtitle?: string | null;
  progress?: number;
  onPress?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  removeIcon?: 'x' | 'heart';
}

export function ContentRail({
  title,
  items,
}: {
  title: string;
  items: RailItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-4 text-lg font-bold font-display text-fg">{title}</h2>
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
        {items.map((item) => (
          <div key={item.key} className="shrink-0 w-30">
            <PosterCard
              title={item.title}
              posterUrl={item.posterUrl}
              subtitle={item.subtitle}
              progress={item.progress}
              onPress={item.onPress}
              onRemove={item.onRemove}
              removeLabel={item.removeLabel}
              removeIcon={item.removeIcon}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
