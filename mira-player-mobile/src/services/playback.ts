import { getDemoPlaybackUrl } from '@/services/demo';
import { XtreamError, type XtreamClient } from '@/services/xtream/client';
import type { Contenido, Episodio } from '@/types/models';

const DEFAULT_EXT = 'mp4';

export function resolvePlaybackUrl(
  client: XtreamClient,
  contenido: Contenido,
  episodio?: Episodio | null,
): string {
  if (contenido.tipo === 'series' && !episodio) {
    throw new XtreamError('Para reproducir una serie se debe indicar el episodio.');
  }

  if (client.demo) {
    const streamId = contenido.tipo === 'series' ? episodio!.stream_id : contenido.stream_id;
    const demoUrl = getDemoPlaybackUrl(streamId);
    if (demoUrl) return demoUrl;
  }

  switch (contenido.tipo) {
    case 'live':
      return client.liveStreamUrl(contenido.stream_id);
    case 'movie':
      return client.movieStreamUrl(contenido.stream_id, contenido.container_extension ?? DEFAULT_EXT);
    case 'series':
      return client.seriesStreamUrl(episodio!.stream_id, episodio!.container_extension ?? DEFAULT_EXT);
  }
}
