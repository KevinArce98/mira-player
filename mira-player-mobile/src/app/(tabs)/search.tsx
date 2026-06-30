import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentGrid } from '@/components/media/content-grid';
import { ThemedView } from '@/components/themed-view';
import { Empty, Loading } from '@/components/ui/empty';
import { ScreenTitle } from '@/components/ui/screen-title';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/data/use-account';
import { useSearch } from '@/hooks/data/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { openContent } from '@/lib/navigation';
import { useT } from '@/providers/preferences';

export default function SearchScreen() {
  const theme = useTheme();
  const t = useT();
  const { data: account } = useAccount();

  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const results = useSearch(account?.id, debounced);
  const hasQuery = debounced.trim().length >= 2;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScreenTitle title={t('search.title')} />

        <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            value={term}
            onChangeText={setTerm}
            returnKeyType="search"
          />
        </View>

        {!hasQuery ? (
          <Empty icon="search-outline" title={t('search.prompt.title')} subtitle={t('search.prompt.subtitle')} />
        ) : results.isLoading ? (
          <Loading />
        ) : (
          <ContentGrid
            items={results.data ?? []}
            onPressItem={openContent}
            contentInsetBottom={BottomTabInset}
            ListEmptyComponent={
              <Empty
                icon="sad-outline"
                title={t('search.noResults.title')}
                subtitle={t('search.noResults.subtitle', { query: debounced })}
              />
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, paddingVertical: Spacing.two, fontSize: 16 },
});
