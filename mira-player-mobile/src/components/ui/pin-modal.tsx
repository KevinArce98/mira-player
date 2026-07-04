import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';

const PIN_LENGTH = 4;

export type PinModalMode = 'create' | 'verify';

interface PinModalProps {
  visible: boolean;
  mode: PinModalMode;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  verify?: (pin: string) => Promise<boolean>;
}

export function PinModal({ visible, mode, onClose, onSuccess, verify }: PinModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible ? (
        <PinModalBody mode={mode} onClose={onClose} onSuccess={onSuccess} verify={verify} />
      ) : null}
    </Modal>
  );
}

function PinModalBody({ mode, onClose, onSuccess, verify }: Omit<PinModalProps, 'visible'>) {
  const theme = useTheme();
  const t = useT();
  const inputRef = useRef<TextInput>(null);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const title =
    mode === 'verify'
      ? t('parental.pin.enter')
      : firstPin === null
        ? t('parental.pin.create')
        : t('parental.pin.confirm');

  const submit = async (value: string) => {
    if (mode === 'create') {
      if (firstPin === null) {
        setFirstPin(value);
        setPin('');
        setError(null);
        return;
      }
      if (value !== firstPin) {
        setFirstPin(null);
        setPin('');
        setError(t('parental.pin.mismatch'));
        return;
      }
      onSuccess(value);
      return;
    }
    if (!verify) {
      onSuccess(value);
      return;
    }
    setBusy(true);
    const ok = await verify(value);
    setBusy(false);
    if (ok) {
      onSuccess(value);
    } else {
      setPin('');
      setError(t('parental.pin.wrong'));
    }
  };

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    setError(null);
    if (digits.length === PIN_LENGTH && !busy) void submit(digits);
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable
        style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={(e) => e.stopPropagation()}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { borderColor: theme.border },
                i < pin.length && { backgroundColor: theme.tint, borderColor: theme.tint },
              ]}
            />
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          secureTextEntry
          autoFocus
          style={styles.hiddenInput}
        />

        {error ? (
          <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
            {error}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {t('parental.pin.hint')}
          </ThemedText>
        )}

        <Pressable onPress={onClose} style={styles.cancel} hitSlop={8}>
          <ThemedText style={{ color: theme.textSecondary, fontFamily: Fonts.semibold }}>
            {t('common.cancel')}
          </ThemedText>
        </Pressable>
      </Pressable>
    </Pressable>
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
    gap: Spacing.three,
  },
  title: { textAlign: 'center' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  hint: { textAlign: 'center' },
  cancel: { alignSelf: 'center', paddingVertical: Spacing.one },
});
