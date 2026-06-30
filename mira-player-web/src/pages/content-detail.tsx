import { Fragment } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ImageOff, Play, Heart, CheckCircle, Circle } from 'lucide-react';
import { Loading } from '@/components/ui/empty';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useContent, useContentDetails, useIsFavorite, useProgressFor, useSetCompleted } from '@/hooks/data/use-content';
import { useEpisodes, useSeriesProgress } from '@/hooks/data/use-episodes';
import { useToggleFavorite } from '@/hooks/data/use-favorites';
import { useT } from '@/providers/preferences';
import type { Episodio, Progreso } from '@/types/models';

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const navigate = useNavigate();

  const { data: content, isLoading } = useContent(id);
  const fav = useIsFavorite(id);
  const toggleFav = useToggleFavorite();
  const setCompleted = useSetCompleted();
  const movieProgress = useProgressFor(content?.tipo === 'movie' ? id : undefined);
  const episodes = useEpisodes(content?.tipo === 'series' ? id : undefined);
  const seriesProgress = useSeriesProgress(content?.tipo === 'series' ? id : undefined);
  const details = useContentDetails(id, content?.tipo);

  if (isLoading || !content) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <Loading />
      </div>
    );
  }

  const resumeSecs = movieProgress.data?.posicion_segundos ?? 0;
  const total = movieProgress.data?.duracion_total ?? 0;
  const watched = movieProgress.data?.completado ?? false;
  const descripcion = details.data?.descripcion ?? content.descripcion;
  const reparto = details.data?.reparto ?? content.reparto;
  const genero = details.data?.genero ?? content.genero;
  const anio = details.data?.anio ?? content.anio;
  const duracionSecs = details.data?.duracion_secs ?? content.duracion_secs;
  const metaParts = [genero, anio, duracionSecs ? formatRuntime(duracionSecs) : null].filter(
    (x): x is string => !!x,
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-bg">
      <div className="p-6 flex flex-col gap-4 max-w-2xl">
        <div className="flex gap-5">
          <div className="w-[120px] shrink-0 bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '2/3' }}>
            {content.poster_url ? (
              <img
                src={content.poster_url}
                alt={content.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageOff size={32} className="text-muted" />
            )}
          </div>
          <div className="flex flex-col gap-1.5 justify-center min-w-0">
            <h1 className="text-xl font-bold leading-snug text-fg">{content.nombre}</h1>
            {content.categoria ? (
              <p className="text-sm text-muted">{content.categoria}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {content.tipo === 'movie' ? (
            <button
              onClick={() => void navigate(`/player?contentId=${content.id}`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold bg-tint text-on-tint border-0 cursor-pointer">
              <Play size={16} fill="currentColor" />
              {resumeSecs > 0 ? t('detail.resume') : t('detail.play')}
            </button>
          ) : null}

          <button
            onClick={() => toggleFav.mutate(content.id)}
            className={`flex items-center justify-center w-11 h-11 rounded-lg border bg-transparent cursor-pointer ${fav.data ? 'text-danger border-danger' : 'text-fg border-border'}`}>
            <Heart size={20} fill={fav.data ? 'currentColor' : 'none'} />
          </button>

          {content.tipo === 'movie' ? (
            <button
              onClick={() =>
                setCompleted.mutate({ contentId: content.id, completado: !watched })
              }
              className={`flex items-center justify-center w-11 h-11 rounded-lg border bg-transparent cursor-pointer ${watched ? 'text-accent border-accent' : 'text-fg border-border'}`}>
              {watched ? <CheckCircle size={20} /> : <Circle size={20} />}
            </button>
          ) : null}
        </div>

        {content.tipo === 'movie' && resumeSecs > 0 && total > 0 ? (
          <div className="flex flex-col gap-1.5">
            <ProgressBar value={resumeSecs / total} />
            <p className="text-xs text-muted">
              {t('detail.progress', { current: formatSecs(resumeSecs), total: formatSecs(total) })}
            </p>
          </div>
        ) : null}

        {details.data?.trailer_url ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">{t('detail.trailer')}</p>
            <div className="w-full rounded-xl overflow-hidden bg-surface border border-border" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={details.data.trailer_url}
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : null}

        {metaParts.length > 0 ? (
          <p className="text-sm font-semibold text-fg">{metaParts.join('  ·  ')}</p>
        ) : null}

        {descripcion ? (
          <p className="text-sm leading-relaxed text-muted">{descripcion}</p>
        ) : null}

        {reparto ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-fg">{t('detail.cast')}</p>
            <p className="text-sm text-muted">{reparto}</p>
          </div>
        ) : null}

        {content.tipo === 'series' ? (
          <SeasonsList
            episodes={episodes.data ?? []}
            loading={episodes.isLoading}
            serieId={content.id}
            progress={seriesProgress.data ?? {}}
            onToggleWatched={(episodeId, completado) =>
              setCompleted.mutate({ contentId: content.id, completado, episodeId })
            }
            onPlayEpisode={(episodeId) =>
              void navigate(`/player?contentId=${content.id}&episodeId=${episodeId}`)
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function SeasonsList({
  episodes,
  loading,
  progress,
  onToggleWatched,
  onPlayEpisode,
}: {
  episodes: Episodio[];
  loading: boolean;
  serieId: string;
  progress: Record<string, Progreso>;
  onToggleWatched: (episodeId: string, completado: boolean) => void;
  onPlayEpisode: (episodeId: string) => void;
}) {
  const t = useT();
  if (loading) return <Loading />;
  if (episodes.length === 0) {
    return <p className="text-sm text-muted">{t('detail.noEpisodes')}</p>;
  }

  const bySeason = new Map<number, Episodio[]>();
  for (const ep of episodes) {
    const list = bySeason.get(ep.temporada) ?? [];
    list.push(ep);
    bySeason.set(ep.temporada, list);
  }

  return (
    <div className="flex flex-col gap-1 mt-2">
      {[...bySeason.entries()].map(([season, eps]) => (
        <Fragment key={season}>
          <h3 className="text-base font-bold mt-4 mb-1 font-display text-fg">
            {t('detail.season', { number: season })}
          </h3>
          {eps.map((ep) => {
            const p = progress[ep.id];
            const epWatched = Boolean(p?.completado);
            const totalSecs = p?.duracion_total ?? ep.duracion ?? 0;
            const fraction =
              !epWatched && p && totalSecs > 0 ? p.posicion_segundos / totalSecs : 0;

            return (
              <div
                key={ep.id}
                className="flex items-center gap-3 py-2.5 border-b border-border">
                <span
                  className={`text-sm font-bold w-6 text-center shrink-0 ${epWatched ? 'text-muted' : 'text-fg'}`}>
                  {ep.episodio}
                </span>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className={`text-sm truncate ${epWatched ? 'text-muted' : 'text-fg'}`}>
                    {ep.titulo ?? t('detail.episode', { number: ep.episodio })}
                  </span>
                  {fraction > 0 ? <ProgressBar value={fraction} /> : null}
                </div>
                <button
                  onClick={() => onToggleWatched(ep.id, !epWatched)}
                  className={`bg-transparent border-0 cursor-pointer shrink-0 ${epWatched ? 'text-accent' : 'text-muted'}`}>
                  {epWatched ? <CheckCircle size={20} /> : <Circle size={20} />}
                </button>
                <button
                  onClick={() => onPlayEpisode(ep.id)}
                  className="bg-transparent border-0 cursor-pointer shrink-0 text-accent">
                  <Play size={20} fill="currentColor" />
                </button>
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRuntime(secs: number): string {
  const totalMin = Math.round(secs / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}
