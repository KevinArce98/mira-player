import { el, poster } from './dom';
import type { MediaItem } from '@/core/media';
import type { ProgressEntry } from '@/core/progress';
import { getSession } from '@/core/session';
import { isFavorite, toggleFavorite } from '@/core/favorites';

interface CardEl extends HTMLElement {
  __item?: MediaItem;
  __star?: HTMLElement;
}

export function mediaCard(item: MediaItem, onSelect: () => void): HTMLElement {
  const { acctKey } = getSession();
  const channel = item.kind === 'live';
  const star = el('span', { class: 'star', html: '★' });
  star.style.display = isFavorite(acctKey, item.kind, item.id) ? 'block' : 'none';

  const card: CardEl = el('div', { class: channel ? 'card channel focusable' : 'card focusable' }, [
    star,
    poster(item.icon),
    el('div', { class: 'label', html: escapeHtml(item.name) }),
  ]);
  card.__item = item;
  card.__star = star;
  card.addEventListener('click', onSelect);
  return card;
}

// Tarjeta de "Continuar viendo": igual que mediaCard pero con barra de
// progreso sobre el póster (posición guardada / duración total).
export function continueCard(entry: ProgressEntry, onSelect: () => void): HTMLElement {
  const pct =
    entry.durationMs > 0 ? Math.min(100, Math.max(0, (entry.positionMs / entry.durationMs) * 100)) : 0;
  const card = el('div', { class: 'card focusable' }, [
    poster(entry.item.icon),
    el('div', { class: 'card-progress' }, [el('div', { style: `width:${pct}%` })]),
    el('div', { class: 'label', html: escapeHtml(entry.item.name) }),
  ]);
  card.addEventListener('click', onSelect);
  return card;
}

// Alterna favorito de la tarjeta enfocada (tecla amarilla del remoto).
export function toggleCardFavorite(card: HTMLElement | null): boolean {
  const c = card as CardEl | null;
  if (!c?.__item || !c.__star) return false;
  const { acctKey } = getSession();
  const nowFav = toggleFavorite(acctKey, c.__item);
  c.__star.style.display = nowFav ? 'block' : 'none';
  return true;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
