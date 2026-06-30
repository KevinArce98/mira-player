import { getAccount } from '@/db/repositories/accounts';
import { getContentById, updateContentDetails } from '@/db/repositories/content';
import { XtreamError } from '@/services/xtream/client';
import { clientFromAccount } from '@/services/xtream/from-account';

export interface ContentDetails {
  descripcion: string | null;
  reparto: string | null;
  genero: string | null;
  anio: string | null;
  duracion_secs: number | null;
  trailer_url: string | null;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseYear(value: string | null | undefined): string | null {
  const match = value?.match(/\d{4}/);
  return match ? match[0] : null;
}

function parseDurationSecs(secs: number | undefined, text: string | null | undefined): number | null {
  if (typeof secs === 'number' && secs > 0) return secs;
  const parts = text?.trim().split(':').map(Number);
  if (parts && parts.length >= 2 && parts.every((n) => !Number.isNaN(n))) {
    const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
    return h * 3600 + m * 60 + (s ?? 0);
  }
  return null;
}

function parseYouTubeEmbedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const urlMatch = value.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ?? value.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (urlMatch) return `https://www.youtube.com/embed/${urlMatch[1]}`;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value.trim())) return `https://www.youtube.com/embed/${value.trim()}`;
  return null;
}

export async function loadContentDetails(contentId: string): Promise<ContentDetails> {
  const empty: ContentDetails = {
    descripcion: null,
    reparto: null,
    genero: null,
    anio: null,
    duracion_secs: null,
    trailer_url: null,
  };

  const content = await getContentById(contentId);
  if (!content || content.tipo === 'live') return empty;

  const cuenta = await getAccount();
  if (!cuenta) throw new XtreamError('No hay cuenta configurada.');
  const client = await clientFromAccount(cuenta);

  let details: ContentDetails;
  if (content.tipo === 'movie') {
    const { info } = await client.vodInfo(content.stream_id);
    details = {
      descripcion: clean(info?.plot),
      reparto: clean(info?.cast),
      genero: clean(info?.genre),
      anio: parseYear(info?.releaseDate ?? info?.releasedate),
      duracion_secs: parseDurationSecs(info?.duration_secs, info?.duration),
      trailer_url: parseYouTubeEmbedUrl(info?.youtube_trailer),
    };
  } else {
    const { info } = await client.seriesInfo(content.stream_id);
    details = {
      descripcion: clean(info?.plot),
      reparto: clean(info?.cast),
      genero: clean(info?.genre),
      anio: parseYear(info?.releaseDate),
      duracion_secs: null,
      trailer_url: null,
    };
  }

  await updateContentDetails(contentId, details);
  return details;
}
