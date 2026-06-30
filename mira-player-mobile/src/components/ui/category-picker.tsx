import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';

export interface CategoryOption {
  id: string | undefined;
  label: string;
}

const OPTION_HEIGHT = 52;

export function CategoryPicker({
  options,
  selectedId,
  onSelect,
}: {
  options: CategoryOption[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef<FlatList<CategoryOption>>(null);
  const wasOpen = useRef(false);

  const selectedLabel = options.find((o) => o.id === selectedId)?.label ?? options[0]?.label ?? '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const index = options.findIndex((o) => o.id === selectedId);
      if (index > 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false });
        }, 60);
      }
    }
    wasOpen.current = open;
  }, [open, options, selectedId]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (id: string | undefined) => {
    onSelect(id);
    close();
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="filter" size={16} color={theme.accent} />
        <ThemedText type="small" style={[styles.triggerLabel, { fontFamily: Fonts.semibold }]} numberOfLines={1}>
          {selectedLabel}
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{t('category.title')}</ThemedText>
              <Pressable onPress={close} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('category.search')}
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                style={[styles.searchInput, { color: theme.text, fontFamily: Fonts.regular }]}
              />
            </View>

            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={(o) => o.id ?? 'all'}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              getItemLayout={(_, index) => ({ length: OPTION_HEIGHT, offset: OPTION_HEIGHT * index, index })}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false });
                }, 80);
              }}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => pick(item.id)}
                    style={[styles.option, active && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText
                      style={{ color: active ? theme.accent : theme.text, fontFamily: active ? Fonts.semibold : Fonts.regular }}
                      numberOfLines={1}>
                      {item.label}
                    </ThemedText>
                    {active ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    maxWidth: 260,
  },
  triggerLabel: { flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetInner: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.three, fontSize: 15 },
  list: { flex: 1 },
  listContent: { paddingBottom: Spacing.six },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: OPTION_HEIGHT,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
});
