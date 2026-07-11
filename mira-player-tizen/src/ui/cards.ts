import { el, poster, escapeHtml } from './dom';
import { confirmDialog } from './dialog';
import type { MediaItem } from '@/core/media';
import type { ProgressEntry } from '@/core/progress';
import { getSession } from '@/core/session';
import { isFavorite, toggleFavorite } from '@/core/favorites';
import { getActiveProfileId } from '@/services/sync/sync-meta';
import { runSync } from '@/services/sync/engine';

export { escapeHtml };

interface CardEl extends HTMLElement {
  __item?: MediaItem;
  __star?: HTMLElement;
}

export function mediaCard(item: MediaItem, onSelect: () => void): HTMLElement {
  const { acctKey } = getSession();
  const channel = item.kind === 'live';
  const star = el('span', { class: 'star', html: '★' });
  star.style.display = isFavorite(acctKey, item.kind, item.id, getActiveProfileId(acctKey)) ? 'block' : 'none';

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

export function continueCard(entry: ProgressEntry, onSelect: () => void, onRemove: () => void): HTMLElement {
  const pct =
    entry.durationMs > 0 ? Math.min(100, Math.max(0, (entry.positionMs / entry.durationMs) * 100)) : 0;
  const removeBtn = el('button', {
    class: 'card-remove focusable',
    html: '✕',
    title: 'Quitar de Continuar viendo',
  });
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    void confirmDialog(`¿Quitar "${entry.item.name}" de Continuar viendo?`).then((ok) => {
      if (ok) onRemove();
    });
  });
  const card = el('div', { class: 'card focusable' }, [
    poster(entry.item.icon),
    removeBtn,
    el('div', { class: 'card-progress' }, [el('div', { style: `width:${pct}%` })]),
    el('div', { class: 'label', html: escapeHtml(entry.item.name) }),
  ]);
  card.addEventListener('click', onSelect);
  return card;
}

export function toggleCardFavorite(card: HTMLElement | null): boolean {
  const c = card as CardEl | null;
  if (!c?.__item || !c.__star) return false;
  const { acctKey } = getSession();
  const nowFav = toggleFavorite(acctKey, c.__item, getActiveProfileId(acctKey));
  c.__star.style.display = nowFav ? 'block' : 'none';
  void runSync();
  return true;
}
