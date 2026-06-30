import { useNavigate } from 'react-router';
import { RefreshCw, Settings } from 'lucide-react';
import { PlayCircle } from 'lucide-react';
import { ContentRail, type RailItem } from '@/components/media/content-rail';
import { Empty, Loading } from '@/components/ui/empty';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAccount } from '@/hooks/data/use-account';
import { useContinueWatching } from '@/hooks/data/use-continue-watching';
import { useFavorites } from '@/hooks/data/use-favorites';
import { useAutoSync } from '@/hooks/data/use-sync';
import { useT } from '@/providers/preferences';
import type { TranslationKey } from '@/lib/i18n';
import type { SyncStage } from '@/services/sync';

const SYNC_STAGES: Record<SyncStage, { labelKey: TranslationKey; fraction: number }> = {
  live: { labelKey: 'sync.live', fraction: 0.25 },
  movies: { labelKey: 'sync.movies', fraction: 0.55 },
  series: { labelKey: 'sync.series', fraction: 0.85 },
  done: { labelKey: 'sync.done', fraction: 1 },
};

export function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const { data: account } = useAccount();
  const accountId = account?.id;
  const sync = useAutoSync();
  const continueWatching = useContinueWatching(accountId);
  const favorites = useFavorites(accountId);

  const continueItems: RailItem[] = (continueWatching.data ?? []).map(
    ({ progreso, contenido, episodio }) => {
      const fraction =
        progreso.duracion_total && progreso.duracion_total > 0
          ? progreso.posicion_segundos / progreso.duracion_total
          : 0;
      const isEpisode = episodio != null;
      return {
        key: progreso.id,
        title: contenido.nombre,
        subtitle: isEpisode
          ? `T${episodio!.temporada} · E${episodio!.episodio}`
          : (contenido.categoria ?? null),
        posterUrl: episodio?.poster_url ?? contenido.poster_url,
        progress: fraction,
        onPress: () =>
          void navigate(`/player?contentId=${contenido.id}${episodio ? `&episodeId=${episodio.id}` : ''}`),
      };
    },
  );

  const favoriteItems: RailItem[] = (favorites.data ?? []).map((c) => ({
    key: c.id,
    title: c.nombre,
    subtitle: c.categoria,
    posterUrl: c.poster_url,
    onPress: () =>
      void navigate(c.tipo === 'live' ? `/player?contentId=${c.id}` : `/content/${c.id}`),
  }));

  const empty = continueItems.length === 0 && favoriteItems.length === 0;
  const stage = sync.progress?.stage ?? 'live';

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold font-display text-fg">{t('home.title')}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => account && sync.mutate(account)}
            disabled={sync.isPending}
            className="bg-transparent border-0 cursor-pointer text-fg disabled:text-muted disabled:cursor-not-allowed">
            <RefreshCw size={20} className={sync.isPending ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => void navigate('/settings')}
            className="bg-transparent border-0 cursor-pointer text-fg">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {sync.isPending ? (
        <div className="px-6 py-2 flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-muted">
              {t('home.syncing', { stage: t(SYNC_STAGES[stage].labelKey) })}
            </span>
            <span className="text-xs text-muted">{sync.progress?.written ?? 0}</span>
          </div>
          <ProgressBar value={SYNC_STAGES[stage].fraction} />
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8">
        {continueWatching.isLoading ? (
          <Loading />
        ) : empty ? (
          <Empty
            icon={PlayCircle}
            title={t('home.empty.title')}
            subtitle={t('home.empty.subtitle')}
          />
        ) : (
          <>
            {continueItems.length > 0 ? (
              <ContentRail title={t('home.continueWatching')} items={continueItems} />
            ) : null}
            {favoriteItems.length > 0 ? (
              <ContentRail title={t('home.favorites')} items={favoriteItems} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
