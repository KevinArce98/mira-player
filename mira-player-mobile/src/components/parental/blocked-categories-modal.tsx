import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { listCategories } from '@/db/repositories/content';
import { useAccount } from '@/hooks/data/use-account';
import { useTheme } from '@/hooks/use-theme';
import type { TranslationKey } from '@/lib/i18n';
import { useParental } from '@/providers/parental';
import { useT } from '@/providers/preferences';
import type { ContentType } from '@/types/models';

const SECTIONS: { tipo: ContentType; labelKey: TranslationKey }[] = [
  { tipo: 'live', labelKey: 'tabs.live' },
  { tipo: 'movie', labelKey: 'tabs.movies' },
  { tipo: 'series', labelKey: 'tabs.series' },
];

function useAllCategories(cuentaId: string | undefined, tipo: ContentType) {
  return useQuery({
    queryKey: ['all-categories', tipo],
    queryFn: () => listCategories(cuentaId!, tipo),
    enabled: !!cuentaId,
  });
}

export function BlockedCategoriesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <BlockedCategoriesBody onClose={onClose} /> : null}
    </Modal>
  );
}

function BlockedCategoriesBody({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const t = useT();
  const { data: account } = useAccount();
  const { blockedCategoryIds, setBlockedCategories } = useParental();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(blockedCategoryIds));

  const live = useAllCategories(account?.id, 'live');
  const movies = useAllCategories(account?.id, 'movie');
  const series = useAllCategories(account?.id, 'series');
  const byType: Record<ContentType, typeof live> = { live, movie: movies, series };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    await setBlockedCategories([...selected]);
    onClose();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('parental.blockedCategories')}</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('parental.blockedCategories.subtitle')}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.content}>
          {SECTIONS.map(({ tipo, labelKey }) => {
            const cats = byType[tipo].data ?? [];
            if (cats.length === 0) return null;
            return (
              <View key={tipo} style={styles.section}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                  {t(labelKey)}
                </ThemedText>
                {cats.map((c) => {
                  if (!c.categoria_id) return null;
                  const checked = selected.has(c.categoria_id);
                  return (
                    <Pressable
                      key={c.categoria_id}
                      onPress={() => toggle(c.categoria_id!)}
                      style={styles.row}>
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={checked ? theme.accent : theme.textSecondary}
                      />
                      <ThemedText style={styles.rowLabel} numberOfLines={1}>
                        {c.categoria ?? c.categoria_id}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {c.total}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={save} style={[styles.saveButton, { backgroundColor: theme.tint }]}>
            <ThemedText themeColor="onTint" style={{ fontFamily: Fonts.bold, fontSize: 16 }}>
              {t('common.save')}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  subtitle: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  section: { gap: Spacing.one },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowLabel: { flex: 1 },
  footer: { padding: Spacing.three },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
});
