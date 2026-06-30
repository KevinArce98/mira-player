import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';
import type { ContentSort } from '@/types/models';

type SortKey =
  | 'catalog.sort.nombre_asc'
  | 'catalog.sort.nombre_desc'
  | 'catalog.sort.anio_desc'
  | 'catalog.sort.anio_asc'
  | 'catalog.sort.reciente';

const OPTIONS: { value: ContentSort; labelKey: SortKey }[] = [
  { value: 'nombre_asc',  labelKey: 'catalog.sort.nombre_asc' },
  { value: 'nombre_desc', labelKey: 'catalog.sort.nombre_desc' },
  { value: 'anio_desc',   labelKey: 'catalog.sort.anio_desc' },
  { value: 'anio_asc',    labelKey: 'catalog.sort.anio_asc' },
  { value: 'reciente',    labelKey: 'catalog.sort.reciente' },
];

export function SortPicker({
  sort,
  onSelect,
}: {
  sort: ContentSort;
  onSelect: (sort: ContentSort) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);

  const currentLabel = OPTIONS.find((o) => o.value === sort)?.labelKey;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="swap-vertical" size={15} color={theme.accent} />
        <ThemedText type="small" style={{ fontFamily: Fonts.semibold, color: theme.text }} numberOfLines={1}>
          {currentLabel ? t(currentLabel) : ''}
        </ThemedText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{t('catalog.sortTitle')}</ThemedText>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            {OPTIONS.map((o) => {
              const active = o.value === sort;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => { onSelect(o.value); setOpen(false); }}
                  style={[styles.option, active && { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText
                    style={{ color: active ? theme.accent : theme.text, fontFamily: active ? Fonts.semibold : Fonts.regular }}>
                    {t(o.labelKey)}
                  </ThemedText>
                  {active ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
                </Pressable>
              );
            })}
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
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetInner: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
});
