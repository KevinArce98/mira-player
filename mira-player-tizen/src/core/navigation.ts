import { Key } from './keys';

export const FOCUSABLE = 'focusable';

type Direction = 'left' | 'up' | 'right' | 'down';

let current: HTMLElement | null = null;

function focusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`.${FOCUSABLE}`)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute('data-disabled'),
  );
}

function center(el: HTMLElement): { x: number; y: number; rect: DOMRect } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
}

function setFocus(el: HTMLElement | null): void {
  if (current === el) return;
  if (current) current.classList.remove('focused');
  current = el;
  if (current) {
    current.classList.add('focused');
    current.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    // Inputs necesitan foco real del DOM para abrir el teclado de la TV.
    if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) {
      current.focus();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}

// Elige el candidato más cercano en la dirección dada, penalizando el
// desalineamiento en el eje perpendicular para no "saltar" de fila/columna.
function findNext(dir: Direction): HTMLElement | null {
  if (!current) return focusables()[0] ?? null;
  const from = center(current);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of focusables()) {
    if (el === current) continue;
    const to = center(el);
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    let primary: number;
    let secondary: number;
    switch (dir) {
      case 'left':
        if (dx >= -1) continue;
        primary = -dx;
        secondary = Math.abs(dy);
        break;
      case 'right':
        if (dx <= 1) continue;
        primary = dx;
        secondary = Math.abs(dy);
        break;
      case 'up':
        if (dy >= -1) continue;
        primary = -dy;
        secondary = Math.abs(dx);
        break;
      case 'down':
        if (dy <= 1) continue;
        primary = dy;
        secondary = Math.abs(dx);
        break;
    }
    const score = primary + secondary * 3;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

export function focusFirst(within?: HTMLElement): void {
  const root = within ?? document.body;
  const el = Array.from(root.querySelectorAll<HTMLElement>(`.${FOCUSABLE}`)).find(
    (e) => e.offsetParent !== null,
  );
  setFocus(el ?? null);
}

export function focusElement(el: HTMLElement | null): void {
  setFocus(el);
}

export function currentFocus(): HTMLElement | null {
  return current;
}

export function resetFocus(): void {
  if (current) current.classList.remove('focused');
  current = null;
}

// Devuelve true si la navegación consumió la tecla.
export function handleNavKey(keyCode: number): boolean {
  switch (keyCode) {
    case Key.Left:
      setFocus(findNext('left') ?? current);
      return true;
    case Key.Right:
      setFocus(findNext('right') ?? current);
      return true;
    case Key.Up:
      setFocus(findNext('up') ?? current);
      return true;
    case Key.Down:
      setFocus(findNext('down') ?? current);
      return true;
    case Key.Enter:
      if (current) {
        current.click();
        return true;
      }
      return false;
    default:
      return false;
  }
}
