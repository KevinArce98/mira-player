import { useQuery } from '@tanstack/react-query';
import { X, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';

import { listCategories } from '@/db/repositories/content';
import { useAccount } from '@/hooks/data/use-account';
import type { TranslationKey } from '@/lib/i18n';
import { useParental } from '@/providers/parental';
import { useT } from '@/providers/preferences';
import type { ContentType } from '@/types/models';

const SECTIONS: { tipo: ContentType; labelKey: TranslationKey }[] = [
  { tipo: 'live', labelKey: 'tabs.live' },
  { tipo: 'movie', labelKey: 'tabs.movies' },
  { tipo: 'series', labelKey: 'tabs.series' },
];

function useAllCategories(cuentaId: string | undefined, tipo: ContentType) {
  return useQuery({
    queryKey: ['all-categories', tipo],
    queryFn: () => listCategories(cuentaId!, tipo),
    enabled: !!cuentaId,
  });
}

export function BlockedCategoriesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return <BlockedCategoriesBody onClose={onClose} />;
}

function BlockedCategoriesBody({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data: account } = useAccount();
  const { blockedCategoryIds, setBlockedCategories } = useParental();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(blockedCategoryIds));

  const live = useAllCategories(account?.id, 'live');
  const movies = useAllCategories(account?.id, 'movie');
  const series = useAllCategories(account?.id, 'series');
  const byType: Record<ContentType, typeof live> = { live, movie: movies, series };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    await setBlockedCategories([...selected]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-xl border border-border bg-bg flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="text-lg font-bold font-display text-fg">{t('parental.blockedCategories')}</h2>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-fg">
            <X size={22} />
          </button>
        </div>
        <p className="px-5 pb-3 text-sm text-muted">{t('parental.blockedCategories.subtitle')}</p>

        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-4">
          {SECTIONS.map(({ tipo, labelKey }) => {
            const cats = byType[tipo].data ?? [];
            if (cats.length === 0) return null;
            return (
              <div key={tipo} className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mt-2">
                  {t(labelKey)}
                </p>
                {cats.map((c) => {
                  if (!c.categoria_id) return null;
                  const checked = selected.has(c.categoria_id);
                  return (
                    <button
                      key={c.categoria_id}
                      onClick={() => toggle(c.categoria_id!)}
                      className="flex items-center gap-3 py-2 bg-transparent border-0 cursor-pointer text-left">
                      {checked ? (
                        <CheckSquare size={20} className="text-tint shrink-0" />
                      ) : (
                        <Square size={20} className="text-muted shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-fg truncate">{c.categoria ?? c.categoria_id}</span>
                      <span className="text-xs text-muted">{c.total}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="p-4">
          <button
            onClick={() => void save()}
            className="w-full py-3 rounded-lg font-bold text-base bg-tint text-on-tint border-0 cursor-pointer">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
