import { create } from 'zustand';

import type { ContentType } from '@/types/models';

interface BrowseState {
  searchTerm: string;
  categoryByType: Partial<Record<ContentType, string | undefined>>;
  setSearchTerm: (term: string) => void;
  setCategory: (tipo: ContentType, categoriaId: string | undefined) => void;
}

export const useBrowseStore = create<BrowseState>((set) => ({
  searchTerm: '',
  categoryByType: {},
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setCategory: (tipo, categoriaId) =>
    set((state) => ({ categoryByType: { ...state.categoryByType, [tipo]: categoriaId } })),
}));
