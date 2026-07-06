import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { BlockedCategoriesModal } from '@/components/parental/blocked-categories-modal';
import { PinModal, type PinModalMode } from '@/components/parental/pin-modal';
import { ProfileSwitcherModal } from '@/components/profiles/profile-switcher-modal';
import { useAccount, useAccountStatus, useDeleteAccount } from '@/hooks/data/use-account';
import { useActiveProfileId, useProfiles } from '@/hooks/data/use-profiles';
import { useSyncCatalog } from '@/hooks/data/use-sync';
import { localeFor, type Language, type TranslationKey } from '@/lib/i18n';
import { useParental } from '@/providers/parental';
import { usePreferences, type ThemeMode } from '@/providers/preferences';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function formatExpiry(exp: string | null | undefined, locale: string, t: Translate): string {
  if (!exp || exp === '0') return t('settings.noExpiry');
  const ms = Number(exp) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return t('common.dash');
  const dateStr = new Date(ms).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const days = Math.ceil((ms - Date.now()) / 86400000);
  if (days < 0) return t('settings.expired', { date: dateStr });
  if (days === 0) return t('settings.expiresToday', { date: dateStr });
  if (days === 1) return t('settings.expiresInDay', { date: dateStr, days });
  return t('settings.expiresInDays', { date: dateStr, days });
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { t, themeMode, setThemeMode, language, setLanguage } = usePreferences();
  const locale = localeFor(language);
  const { data: account } = useAccount();
  const { data: status, isLoading: statusLoading } = useAccountStatus();
  const sync = useSyncCatalog();
  const del = useDeleteAccount();
  const parental = useParental();

  const [pinPurpose, setPinPurpose] = useState<'enable' | 'disable' | 'manage' | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const { data: profiles = [] } = useProfiles();
  const { data: activeProfileId } = useActiveProfileId();
  const activeProfileName = profiles.find((p) => p.id === activeProfileId)?.nombre ?? t('common.dash');

  const pinMode: PinModalMode = pinPurpose === 'enable' ? 'create' : 'verify';

  const onPinSuccess = async (pin: string) => {
    const purpose = pinPurpose;
    setPinPurpose(null);
    if (purpose === 'enable') await parental.enable(pin);
    else if (purpose === 'disable') await parental.disable();
    else if (purpose === 'manage') setBlockedOpen(true);
  };

  const lastSync = account?.ultima_sincronizacion
    ? new Date(account.ultima_sincronizacion).toLocaleString(locale)
    : t('settings.never');

  const pending = statusLoading ? t('settings.loading') : t('common.dash');
  const estado = status
    ? status.status?.toLowerCase() === 'active'
      ? t('settings.active')
      : (status.status ?? pending)
    : pending;
  const expira = status ? formatExpiry(status.exp_date, locale, t) : pending;
  const conexiones = status
    ? `${status.active_cons ?? '0'} / ${status.max_connections ?? t('common.dash')}`
    : pending;

  const themeOptions: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: t('settings.theme.system') },
    { mode: 'light', label: t('settings.theme.light') },
    { mode: 'dark', label: t('settings.theme.dark') },
  ];
  const langOptions: { code: Language; label: string }[] = [
    { code: 'es', label: t('language.es') },
    { code: 'en', label: t('language.en') },
  ];

  const confirmDelete = () => {
    if (
      window.confirm(
        `${t('settings.logoutConfirm.title')}\n${t('settings.logoutConfirm.message')}`,
      )
    ) {
      if (account) {
        del.mutate(account.id, { onSuccess: () => void navigate('/setup', { replace: true }) });
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-bg">
      <div className="flex items-center px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold font-display text-fg">{t('settings.title')}</h1>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-lg">
        <div className="rounded-lg overflow-hidden border border-border bg-surface">
          <Row label={t('settings.server')} value={account?.servidor ?? t('common.dash')} />
          <Row label={t('settings.user')} value={account?.usuario ?? t('common.dash')} />
          <Row label={t('settings.status')} value={estado} />
          <Row label={t('settings.expires')} value={expira} />
          <Row label={t('settings.connections')} value={conexiones} />
          <Row label={t('settings.lastSync')} value={lastSync} last />
        </div>

        <SectionLabel>{t('settings.profiles')}</SectionLabel>
        <div className="rounded-lg overflow-hidden border border-border bg-surface">
          <button
            onClick={() => setProfilesOpen(true)}
            className="flex items-center justify-between w-full gap-4 px-4 py-3 border-0 bg-transparent cursor-pointer">
            <span className="text-sm text-fg">{t('settings.profiles')}</span>
            <span className="flex items-center gap-1 text-sm text-muted">
              {activeProfileName}
              <ChevronRight size={15} />
            </span>
          </button>
        </div>

        <SectionLabel>{t('settings.appearance')}</SectionLabel>
        <Segmented
          options={themeOptions.map((o) => ({ key: o.mode, label: o.label }))}
          selectedKey={themeMode}
          onSelect={(k) => setThemeMode(k as ThemeMode)}
        />

        <SectionLabel>{t('settings.language')}</SectionLabel>
        <Segmented
          options={langOptions.map((o) => ({ key: o.code, label: o.label }))}
          selectedKey={language}
          onSelect={(k) => setLanguage(k as Language)}
        />

        <SectionLabel>{t('parental.title')}</SectionLabel>
        <div className="rounded-lg overflow-hidden border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-fg">{t('parental.title')}</span>
              <span className="text-xs text-muted">{t('parental.description')}</span>
            </div>
            <button
              role="switch"
              aria-checked={parental.enabled}
              onClick={() => setPinPurpose(parental.enabled ? 'disable' : 'enable')}
              className={`relative w-11 h-6 rounded-full border-0 cursor-pointer shrink-0 transition-colors ${parental.enabled ? 'bg-tint' : 'bg-border'}`}>
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${parental.enabled ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
          {parental.enabled ? (
            <button
              onClick={() => setPinPurpose('manage')}
              className="flex items-center justify-between w-full gap-4 px-4 py-3 border-0 border-t border-border bg-transparent cursor-pointer">
              <span className="text-sm text-fg">{t('parental.blockedCategories')}</span>
              <span className="flex items-center gap-1 text-sm text-muted">
                {parental.blockedCategoryIds.length}
                <ChevronRight size={15} />
              </span>
            </button>
          ) : null}
        </div>

        <button
          onClick={() => account && sync.mutate(account)}
          disabled={sync.isPending}
          className="flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-base transition-opacity bg-tint text-on-tint border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
          {sync.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          {sync.isPending
            ? t('settings.syncing', { count: sync.progress?.written ?? 0 })
            : t('settings.syncNow')}
        </button>

        <button
          onClick={confirmDelete}
          className="flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-base bg-transparent text-danger border border-danger cursor-pointer">
          <LogOut size={18} />
          {t('settings.logout')}
        </button>
      </div>

      <PinModal
        visible={pinPurpose !== null}
        mode={pinMode}
        onClose={() => setPinPurpose(null)}
        onSuccess={(pin) => void onPinSuccess(pin)}
        verify={parental.verifyPin}
      />
      <BlockedCategoriesModal visible={blockedOpen} onClose={() => setBlockedOpen(false)} />
      <ProfileSwitcherModal visible={profilesOpen} onClose={() => setProfilesOpen(false)} />
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center gap-4 px-4 py-3 ${last ? '' : 'border-b border-border'}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold truncate text-fg max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted">{children}</p>
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
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border">
      {options.map((o) => {
        const active = o.key === selectedKey;
        return (
          <button
            key={o.key}
            onClick={() => onSelect(o.key)}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors border-0 cursor-pointer
              ${active ? 'bg-tint text-on-tint' : 'bg-transparent text-fg'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
