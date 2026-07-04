import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useSaveAccount, useSaveDemoAccount } from '@/hooks/data/use-account';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/providers/preferences';

export default function SetupScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const save = useSaveAccount();
  const saveDemo = useSaveDemoAccount();

  const [servidor, setServidor] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isAnyPending = save.isPending || saveDemo.isPending;
  const canSubmit = servidor.trim() && usuario.trim() && password.trim() && termsAccepted && !isAnyPending;
  const canDemo = termsAccepted && !isAnyPending;

  const onSubmit = () => {
    save.mutate(
      { servidor: servidor.trim(), usuario: usuario.trim(), password },
      { onSuccess: () => router.replace('/(tabs)/home') },
    );
  };

  const onDemoPress = () => {
    saveDemo.mutate(undefined, { onSuccess: () => router.replace('/(tabs)/home') });
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
  ];

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Ionicons name="play-circle-outline" size={48} color={theme.accent} style={styles.logo} />
            <ThemedText style={styles.brand}>
              Mira
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heading}>
              {t('setup.connect')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
              {t('setup.subtitle')}
            </ThemedText>

            <ThemedText type="small" style={styles.label}>
              {t('setup.server')}
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="http://host:puerto"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              value={servidor}
              onChangeText={setServidor}
            />

            <ThemedText type="small" style={styles.label}>
              {t('setup.user')}
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="usuario"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              value={usuario}
              onChangeText={setUsuario}
            />

            <ThemedText type="small" style={styles.label}>
              {t('setup.password')}
            </ThemedText>
            <ThemedView style={styles.passwordWrap}>
              <TextInput
                style={[inputStyle, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                style={styles.eye}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('setup.hidePassword') : t('setup.showPassword')}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>
            </ThemedView>

            {save.isError ? (
              <ThemedText type="small" themeColor="danger" style={styles.error}>
                {save.error instanceof Error ? save.error.message : t('setup.connectError')}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={() => setTermsAccepted((v) => !v)}
              style={styles.checkboxRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}>
              <Ionicons
                name={termsAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color={termsAccepted ? theme.tint : theme.textSecondary}
                style={styles.checkboxIcon}
              />
              <Text style={[styles.checkboxLabel, { color: theme.textSecondary }]}>
                {t('setup.legalCheckbox')}
                <Text
                  style={{ color: theme.accent, fontFamily: Fonts.semibold }}
                  onPress={() => Linking.openURL('https://kevinarce98.github.io/mira-player/terms/')}>
                  {t('setup.legalTermsLink')}
                </Text>
              </Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={[styles.button, { backgroundColor: theme.tint, opacity: canSubmit ? 1 : 0.4 }]}>
              {save.isPending ? (
                <ActivityIndicator color={theme.onTint} />
              ) : (
                <ThemedText themeColor="onTint" style={styles.buttonText}>
                  {t('setup.submit')}
                </ThemedText>
              )}
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {t('setup.note')}
            </ThemedText>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.dividerLabel}>
                {t('setup.or')}
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.demoNote}>
              {t('setup.demoNote')}
            </ThemedText>

            <Pressable
              onPress={onDemoPress}
              disabled={!canDemo}
              style={[styles.demoButton, { borderColor: theme.border, opacity: canDemo ? 1 : 0.4 }]}>
              {saveDemo.isPending ? (
                <ActivityIndicator color={theme.textSecondary} />
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.buttonText}>
                  {t('setup.demoButton')}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two, flexGrow: 1, justifyContent: 'center' },
  logo: { alignSelf: 'center' },
  brand: {
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 42,
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  heading: { textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: Spacing.three },
  label: { fontFamily: Fonts.semibold, marginTop: Spacing.two },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: Spacing.six },
  eye: { position: 'absolute', right: Spacing.three, top: 0, bottom: 0, justifyContent: 'center' },
  error: { marginTop: Spacing.two },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginTop: Spacing.two },
  checkboxIcon: { marginTop: 1 },
  checkboxLabel: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: Fonts.regular },
  button: {
    marginTop: Spacing.three,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { fontFamily: Fonts.bold, fontSize: 16 },
  note: { textAlign: 'center', marginTop: Spacing.two },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { paddingHorizontal: Spacing.one },
  demoNote: { textAlign: 'center' },
  demoButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
});
