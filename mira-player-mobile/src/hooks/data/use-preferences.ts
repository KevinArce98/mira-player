import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPreference, PREF_SUBTITLE_LANG, setPreference } from '@/db/repositories/preferences';

export function useSubtitleLang() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['pref', PREF_SUBTITLE_LANG],
    queryFn: () => getPreference(PREF_SUBTITLE_LANG),
  });
  const mutation = useMutation({
    mutationFn: (lang: string | null) => setPreference(PREF_SUBTITLE_LANG, lang),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pref', PREF_SUBTITLE_LANG] }),
  });
  return { lang: query.data ?? null, setLang: mutation.mutate, isLoaded: !query.isLoading };
}
