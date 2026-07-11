export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & {
    class?: string;
    html?: string;
    style?: string;
  } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: className, html, style, ...rest } = props as Record<string, unknown>;
  if (className) node.className = String(className);
  if (html !== undefined) node.innerHTML = String(html);
  if (style !== undefined) node.setAttribute('style', String(style));
  Object.assign(node, rest);
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.innerHTML = '';
}

const FALLBACK_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="320"><rect width="100%" height="100%" fill="#3c3b38"/><text x="50%" y="50%" fill="#a39c90" font-size="18" font-family="sans-serif" text-anchor="middle" dy=".3em">Mira Player</text></svg>`,
  );

export function poster(url: string | null, klass = 'poster'): HTMLImageElement {
  const img = el('img', { class: klass, src: url || FALLBACK_POSTER });
  img.onerror = () => {
    img.src = FALLBACK_POSTER;
  };
  return img;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
