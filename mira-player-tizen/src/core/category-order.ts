import type { MediaKind } from './media';

const key = (acct: string, kind: MediaKind) => `mira_catorder_${acct}_${kind}`;

export function getCategoryOrder(acct: string, kind: MediaKind): string[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct, kind)) || '[]') as string[];
  } catch {
    return [];
  }
}

export function setCategoryOrder(acct: string, kind: MediaKind, ids: string[]): void {
  localStorage.setItem(key(acct, kind), JSON.stringify(ids));
}

export function applyCategoryOrder<T extends { category_id: string }>(
  cats: T[],
  order: string[],
): T[] {
  if (!order.length) return cats;
  const pos = new Map(order.map((id, i) => [id, i]));
  return [...cats].sort((a, b) => {
    const pa = pos.has(a.category_id) ? pos.get(a.category_id)! : Number.MAX_SAFE_INTEGER;
    const pb = pos.has(b.category_id) ? pos.get(b.category_id)! : Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });
}
