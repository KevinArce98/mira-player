import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentGrid } from '@/components/media/content-grid';
import { ThemedView } from '@/components/themed-view';
import { CategoryPicker } from '@/components/ui/category-picker';
import { Empty, Loading } from '@/components/ui/empty';
import { ScreenTitle } from '@/components/ui/screen-title';
import { SortPicker } from '@/components/ui/sort-picker';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/data/use-account';
import { useCatalog, useCatalogCount, useCategories } from '@/hooks/data/use-catalog';
import type { TranslationKey } from '@/lib/i18n';
import { openContent } from '@/lib/navigation';
import { useT } from '@/providers/preferences';
import type { ContentSort, ContentType } from '@/types/models';
import { useTheme } from '@/hooks/use-theme';

export function CatalogTab({ tipo, titleKey }: { tipo: ContentType; titleKey: TranslationKey }) {
  const t = useT();
  const theme = useTheme();
  const { data: account } = useAccount();
  const accountId = account?.id;

  const [categoriaId, setCategoriaId] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<ContentSort>('nombre_asc');

  const categories = useCategories(accountId, tipo);
  const catalog = useCatalog(accountId, tipo, categoriaId, sort);
  const countQuery = useCatalogCount(accountId, tipo, categoriaId);

  const options = [
    { id: undefined as string | undefined, label: t('catalog.all') },
    ...(categories.data ?? []).map((c) => ({ id: c.categoria_id ?? undefined, label: c.categoria ?? t('catalog.all') })),
  ];

  const header = countQuery.data != null ? (
    <View style={styles.countRow}>
      <ThemedText type="small" style={{ color: theme.textSecondary, fontFamily: Fonts.regular }}>
        {t('catalog.count', { count: countQuery.data })}
      </ThemedText>
    </View>
  ) : null;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScreenTitle title={t(titleKey)} />

        <View style={styles.filterRow}>
          <CategoryPicker options={options} selectedId={categoriaId} onSelect={setCategoriaId} />
          <SortPicker sort={sort} onSelect={setSort} />
        </View>

        {catalog.isLoading ? (
          <Loading />
        ) : (
          <ContentGrid
            items={catalog.data ?? []}
            onPressItem={openContent}
            contentInsetBottom={BottomTabInset}
            ListHeaderComponent={header}
            ListEmptyComponent={
              catalog.isError ? (
                <Empty
                  icon="cloud-offline-outline"
                  title={t('error.loadFailed.title')}
                  subtitle={t('error.loadFailed.subtitle')}
                />
              ) : (
                <Empty
                  icon="film-outline"
                  title={t('catalog.empty.title')}
                  subtitle={t('catalog.empty.subtitle')}
                />
              )
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    flexWrap: 'wrap',
  },
  countRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
});
