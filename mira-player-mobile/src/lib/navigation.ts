import { router } from 'expo-router';

import type { Contenido } from '@/types/models';

export function openContent(contenido: Contenido) {
  if (contenido.tipo === 'live') {
    router.push({ pathname: '/player', params: { contentId: contenido.id } });
  } else {
    router.push({ pathname: '/content/[id]', params: { id: contenido.id } });
  }
}

export function playContent(contentId: string, episodeId?: string) {
  router.push({ pathname: '/player', params: { contentId, ...(episodeId ? { episodeId } : {}) } });
}
