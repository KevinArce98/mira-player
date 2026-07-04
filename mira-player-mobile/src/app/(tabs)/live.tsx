import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelRow } from '@/components/media/channel-row';
import { ThemedView } from '@/components/themed-view';
import { CategoryPicker } from '@/components/ui/category-picker';
import { Empty, Loading } from '@/components/ui/empty';
import { ScreenTitle } from '@/components/ui/screen-title';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/data/use-account';
import {
  applyCategoryOrder,
  useCatalog,
  useCategories,
  useCategoryOrder,
} from '@/hooks/data/use-catalog';
import { openContent } from '@/lib/navigation';
import { useT } from '@/providers/preferences';
import { useBrowseStore } from '@/stores/browse';

export default function LiveScreen() {
  const t = useT();
  const { data: account } = useAccount();
  const accountId = account?.id;

  const categoriaId = useBrowseStore((s) => s.categoryByType.live);
  const setCategory = useBrowseStore((s) => s.setCategory);
  const { order, setOrder } = useCategoryOrder('live');
  const categories = useCategories(accountId, 'live');
  const channels = useCatalog(accountId, 'live', categoriaId);

  const categoryOptions = applyCategoryOrder(
    (categories.data ?? []).map((c) => ({
      id: c.categoria_id ?? undefined,
      label: c.categoria ?? t('live.all'),
    })),
    order,
  );
  const options = [{ id: undefined as string | undefined, label: t('live.all') }, ...categoryOptions];

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScreenTitle title={t('live.title')} />

        <View style={styles.pickerWrap}>
          <CategoryPicker
            options={options}
            selectedId={categoriaId}
            onSelect={(id) => setCategory('live', id)}
            onReorder={setOrder}
          />
        </View>

        {channels.isLoading ? (
          <Loading />
        ) : (
          <FlatList
            data={channels.data ?? []}
            keyExtractor={(c) => c.id}
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews
            contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
            renderItem={({ item }) => <ChannelRow channel={item} onPress={() => openContent(item)} />}
            ListEmptyComponent={
              channels.isError ? (
                <Empty icon="cloud-offline-outline" title={t('error.loadFailed.title')} subtitle={t('error.loadFailed.subtitle')} />
              ) : (
                <Empty icon="tv-outline" title={t('live.empty.title')} subtitle={t('live.empty.subtitle')} />
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
  pickerWrap: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
