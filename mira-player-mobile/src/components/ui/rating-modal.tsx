import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';
import {
  deferRating,
  markRatingPrompted,
  optOutOfRating,
  shouldPromptRating,
} from '@/services/rating';

export function RatingPrompt() {
  const theme = useTheme();
  const t = useT();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (await shouldPromptRating()) {
          if (!active) return;
          await markRatingPrompted();
          setVisible(true);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const rate = async () => {
    setVisible(false);
    await optOutOfRating();
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  };

  const later = async () => {
    setVisible(false);
    await deferRating();
  };

  const never = async () => {
    setVisible(false);
    await optOutOfRating();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void later()}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Ionicons name="star" size={36} color={theme.accent} style={styles.icon} />
          <ThemedText type="subtitle" style={styles.title}>
            {t('rating.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {t('rating.message')}
          </ThemedText>

          <Pressable onPress={() => void rate()} style={[styles.button, { backgroundColor: theme.tint }]}>
            <ThemedText themeColor="onTint" style={styles.buttonText}>
              {t('rating.rate')}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => void later()} style={[styles.button, styles.outline, { borderColor: theme.border }]}>
            <ThemedText style={[styles.buttonText, { color: theme.text }]}>{t('rating.later')}</ThemedText>
          </Pressable>
          <Pressable onPress={() => void never()} style={styles.linkButton} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('rating.never')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  icon: { alignSelf: 'center' },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginBottom: Spacing.two },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  outline: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontFamily: Fonts.bold, fontSize: 15 },
  linkButton: { alignSelf: 'center', paddingVertical: Spacing.one },
});
