import type { ContentSort, ContentType } from '@/types/models';

interface CatalogBrowseState {
  categoriaId?: string;
  term: string;
  sort?: ContentSort;
}

const catalogState: Partial<Record<ContentType, CatalogBrowseState>> = {};
let globalSearchTerm = '';

export function getCatalogBrowseState(tipo: ContentType): CatalogBrowseState {
  return catalogState[tipo] ?? { term: '' };
}

export function setCatalogBrowseState(tipo: ContentType, state: CatalogBrowseState): void {
  catalogState[tipo] = state;
}

export function getGlobalSearchTerm(): string {
  return globalSearchTerm;
}

export function setGlobalSearchTerm(term: string): void {
  globalSearchTerm = term;
}
