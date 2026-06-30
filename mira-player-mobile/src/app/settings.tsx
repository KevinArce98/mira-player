import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useAccount, useAccountStatus, useDeleteAccount } from '@/hooks/data/use-account';
import { isDemoAccount } from '@/services/demo';
import { useSyncCatalog } from '@/hooks/data/use-sync';
import { useTheme } from '@/hooks/use-theme';
import { localeFor, type Language, type TranslationKey } from '@/lib/i18n';
import { usePreferences, type ThemeMode } from '@/providers/preferences';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function formatExpiry(exp: string | null | undefined, locale: string, t: Translate): string {
  if (!exp || exp === '0') return t('settings.noExpiry');
  const ms = Number(exp) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return t('common.dash');
  const dateStr = new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const days = Math.ceil((ms - Date.now()) / 86400000);
  if (days < 0) return t('settings.expired', { date: dateStr });
  if (days === 0) return t('settings.expiresToday', { date: dateStr });
  if (days === 1) return t('settings.expiresInDay', { date: dateStr, days });
  return t('settings.expiresInDays', { date: dateStr, days });
}

function statusLabel(s: string | undefined, t: Translate): string {
  if (!s) return t('common.dash');
  return s.toLowerCase() === 'active' ? t('settings.active') : s;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const nav = useRouter();
  const { t, themeMode, setThemeMode, language, setLanguage } = usePreferences();
  const locale = localeFor(language);
  const { data: account } = useAccount();
  const { data: status, isLoading: statusLoading } = useAccountStatus();
  const sync = useSyncCatalog();
  const del = useDeleteAccount();

  const isDemo = account ? isDemoAccount(account) : false;

  const lastSync = account?.ultima_sincronizacion
    ? new Date(account.ultima_sincronizacion).toLocaleString(locale)
    : t('settings.never');

  const pending = statusLoading ? t('settings.loading') : t('common.dash');
  const estado = status ? statusLabel(status.status, t) : pending;
  const expira = status ? formatExpiry(status.exp_date, locale, t) : pending;
  const conexiones = status ? `${status.active_cons ?? '0'} / ${status.max_connections ?? t('common.dash')}` : pending;
  const isTrial = status?.is_trial === '1';

  const themeOptions: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: t('settings.theme.system') },
    { mode: 'light', label: t('settings.theme.light') },
    { mode: 'dark', label: t('settings.theme.dark') },
  ];
  const languageOptions: { code: Language; label: string }[] = [
    { code: 'es', label: t('language.es') },
    { code: 'en', label: t('language.en') },
  ];

  const confirmDelete = () => {
    Alert.alert(t('settings.logoutConfirm.title'), t('settings.logoutConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          if (account) del.mutate(account.id, { onSuccess: () => router.replace('/setup') });
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {isDemo ? (
          <View style={[styles.card, styles.demoBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.demoTitle}>{t('settings.demoMode')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t('settings.demoDescription')}</ThemedText>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {isDemo ? (
            <Row label={t('settings.lastSync')} value={lastSync} last />
          ) : (
            <>
              <Row label={t('settings.server')} value={account?.servidor ?? t('common.dash')} />
              <Row label={t('settings.user')} value={account?.usuario ?? t('common.dash')} />
              <Row label={t('settings.status')} value={estado} />
              <Row label={t('settings.expires')} value={expira} />
              <Row label={t('settings.connections')} value={conexiones} />
              {isTrial ? <Row label={t('settings.trial')} value={t('settings.yes')} /> : null}
              <Row label={t('settings.lastSync')} value={lastSync} last />
            </>
          )}
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          {t('settings.appearance')}
        </ThemedText>
        <Segmented
          options={themeOptions.map((o) => ({ key: o.mode, label: o.label }))}
          selectedKey={themeMode}
          onSelect={(key) => setThemeMode(key as ThemeMode)}
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          {t('settings.language')}
        </ThemedText>
        <Segmented
          options={languageOptions.map((o) => ({ key: o.code, label: o.label }))}
          selectedKey={language}
          onSelect={(key) => setLanguage(key as Language)}
        />

        <Pressable
          onPress={() => account && sync.mutate(account)}
          disabled={sync.isPending}
          style={[styles.button, { backgroundColor: theme.tint, opacity: sync.isPending ? 0.6 : 1 }]}>
          <Ionicons name="refresh" size={18} color={theme.onTint} />
          <ThemedText themeColor="onTint" style={styles.buttonText}>
            {sync.isPending ? t('settings.syncing', { count: sync.progress?.written ?? 0 }) : t('settings.syncNow')}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL('https://kevinarce98.github.io/mira-tv-mobile/terms/')}
          style={[styles.button, styles.outline, { borderColor: theme.border }]}>
          <Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.buttonText}>
            {t('settings.legal')}
          </ThemedText>
        </Pressable>

        <Pressable onPress={confirmDelete} style={[styles.button, styles.outline, { borderColor: theme.danger }]}>
          <Ionicons name="log-out-outline" size={18} color={theme.danger} />
          <ThemedText style={[styles.buttonText, { color: theme.danger }]}>{t('settings.logout')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function Segmented({
  options,
  selectedKey,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {options.map((o) => {
        const active = o.key === selectedKey;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={[styles.segmentItem, active && { backgroundColor: theme.tint }]}>
            <ThemedText
              type="small"
              style={{
                fontFamily: Fonts.semibold,
                color: active ? theme.onTint : theme.text,
              }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" numberOfLines={1} style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three },
  demoBanner: { padding: Spacing.three, gap: Spacing.one },
  demoTitle: { fontFamily: Fonts.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  value: { flexShrink: 1, fontFamily: Fonts.semibold },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -Spacing.two, marginLeft: Spacing.one },
  segment: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  buttonText: { fontFamily: Fonts.bold, fontSize: 16 },
  outline: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth },
});
