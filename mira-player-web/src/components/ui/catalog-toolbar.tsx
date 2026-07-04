import { ArrowUpDown, Search } from 'lucide-react';
import { CategoryCombobox, type ComboboxOption } from './category-combobox';
import { useT } from '@/providers/preferences';
import type { ContentSort } from '@/types/models';

export type { ComboboxOption };

type SortKey =
  | 'catalog.sort.defecto'
  | 'catalog.sort.nombre_asc'
  | 'catalog.sort.nombre_desc'
  | 'catalog.sort.anio_desc'
  | 'catalog.sort.anio_asc'
  | 'catalog.sort.reciente';

const SORT_OPTIONS: { value: ContentSort; labelKey: SortKey }[] = [
  { value: 'defecto',     labelKey: 'catalog.sort.defecto' },
  { value: 'nombre_asc',  labelKey: 'catalog.sort.nombre_asc' },
  { value: 'nombre_desc', labelKey: 'catalog.sort.nombre_desc' },
  { value: 'anio_desc',   labelKey: 'catalog.sort.anio_desc' },
  { value: 'anio_asc',    labelKey: 'catalog.sort.anio_asc' },
  { value: 'reciente',    labelKey: 'catalog.sort.reciente' },
];

export function CatalogToolbar({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  categories,
  selectedId,
  onSelectCategory,
  categoryPlaceholder,
  sort,
  onSortChange,
  onReorderCategories,
}: {
  title: string;
  count?: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  categories: ComboboxOption[];
  selectedId: string | undefined;
  onSelectCategory: (id: string | undefined) => void;
  categoryPlaceholder: string;
  sort?: ContentSort;
  onSortChange?: (sort: ContentSort) => void;
  onReorderCategories?: (ids: string[]) => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-col gap-2.5 border-b border-border px-4 sm:px-6 py-3 sm:py-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold font-display text-fg truncate">{title}</h1>
        {count != null && (
          <span className="ml-auto text-xs text-muted whitespace-nowrap shrink-0">
            {t('catalog.count', { count })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
        <Search size={15} className="text-muted shrink-0" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-fg"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="shrink-0">
          <CategoryCombobox
            options={categories}
            selectedId={selectedId}
            onSelect={onSelectCategory}
            placeholder={categoryPlaceholder}
            onReorder={onReorderCategories}
          />
        </div>

        {sort != null && onSortChange ? (
          <div className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg bg-surface border border-border">
            <ArrowUpDown size={13} className="text-muted shrink-0" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as ContentSort)}
              className="bg-transparent border-0 outline-none text-sm text-fg cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
