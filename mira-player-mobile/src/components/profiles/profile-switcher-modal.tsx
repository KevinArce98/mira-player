import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import {
  useActiveProfileId,
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useRenameProfile,
  useSwitchProfile,
} from '@/hooks/data/use-profiles';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';

export function ProfileSwitcherModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <ProfileSwitcherBody onClose={onClose} /> : null}
    </Modal>
  );
}

function ProfileSwitcherBody({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { data: profiles = [] } = useProfiles();
  const { data: activeId } = useActiveProfileId();
  const switchProfile = useSwitchProfile();
  const createProfile = useCreateProfile();
  const renameProfile = useRenameProfile();
  const deleteProfile = useDeleteProfile();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const select = (id: string) => {
    if (id === activeId) return onClose();
    switchProfile.mutate(id, { onSuccess: onClose });
  };

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const profile = await createProfile.mutateAsync(trimmed);
    setName('');
    setCreating(false);
    switchProfile.mutate(profile.id, { onSuccess: onClose });
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const submitEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !editingId) return setEditingId(null);
    await renameProfile.mutateAsync({ id: editingId, nombre: trimmed });
    setEditingId(null);
  };

  const confirmDelete = (id: string, nombre: string) => {
    if (id === activeId) {
      Alert.alert(t('settings.profiles.cannotDeleteActive'));
      return;
    }
    Alert.alert(t('settings.profiles.deleteTitle'), t('settings.profiles.deleteMessage', { nombre }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteProfile.mutate(id) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{t('settings.profiles')}</ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
        {t('settings.profiles.subtitle')}
      </ThemedText>

      <ScrollView contentContainerStyle={styles.content}>
        {profiles.map((p) => {
          const active = p.id === activeId;
          if (editingId === p.id) {
            return (
              <View key={p.id} style={styles.createRow}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  autoFocus
                  onSubmitEditing={() => void submitEdit()}
                />
                <View style={styles.editActions}>
                  <Pressable onPress={() => setEditingId(null)} style={styles.editActionBtn}>
                    <ThemedText themeColor="textSecondary">{t('common.cancel')}</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => void submitEdit()}
                    disabled={renameProfile.isPending}
                    style={[styles.saveButton, styles.editActionBtn, { backgroundColor: theme.tint }]}>
                    <ThemedText themeColor="onTint" style={{ fontFamily: Fonts.bold }}>
                      {t('common.save')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          }
          return (
            <View key={p.id} style={styles.row}>
              <Pressable onPress={() => select(p.id)} style={styles.rowMain}>
                <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
                  <ThemedText themeColor="onTint" style={styles.avatarText}>
                    {p.nombre.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText style={styles.rowLabel} numberOfLines={1}>
                  {p.nombre}
                </ThemedText>
                {active ? <Ionicons name="checkmark-circle" size={22} color={theme.tint} /> : null}
              </Pressable>
              <Pressable onPress={() => startEdit(p.id, p.nombre)} hitSlop={8} style={styles.rowAction}>
                <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(p.id, p.nombre)} hitSlop={8} style={styles.rowAction}>
                <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          );
        })}

        {creating ? (
          <View style={styles.createRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('settings.profiles.namePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              autoFocus
              onSubmitEditing={() => void submitCreate()}
            />
            <Pressable
              onPress={() => void submitCreate()}
              disabled={createProfile.isPending}
              style={[styles.saveButton, { backgroundColor: theme.tint }]}>
              <ThemedText themeColor="onTint" style={{ fontFamily: Fonts.bold }}>
                {t('settings.profiles.create')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setCreating(true)} style={styles.row}>
            <View style={[styles.avatar, styles.avatarAdd, { borderColor: theme.border }]}>
              <Ionicons name="add" size={20} color={theme.textSecondary} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('settings.profiles.newProfile')}
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </View>
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
  content: { paddingHorizontal: Spacing.three, gap: Spacing.one, paddingBottom: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowAction: {
    padding: Spacing.one,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  editActionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdd: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth },
  avatarText: { fontFamily: Fonts.bold, fontSize: 16 },
  rowLabel: { flex: 1, fontFamily: Fonts.semibold },
  createRow: { gap: Spacing.two, paddingVertical: Spacing.two },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
