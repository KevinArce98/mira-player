import { NavLink } from 'react-router';
import { Home, Tv, Film, Clapperboard, Search, Settings } from 'lucide-react';
import { useT } from '@/providers/preferences';

const NAV = [
  { to: '/home', icon: Home, labelKey: 'tabs.home' },
  { to: '/live', icon: Tv, labelKey: 'tabs.live' },
  { to: '/movies', icon: Film, labelKey: 'tabs.movies' },
  { to: '/series', icon: Clapperboard, labelKey: 'tabs.series' },
  { to: '/search', icon: Search, labelKey: 'tabs.search' },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-3 py-2.5 rounded-lg text-sm no-underline transition-colors
  ${isActive ? 'font-semibold text-tint bg-surface' : 'font-normal text-fg'}`;

const settingsClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-3 py-2.5 rounded-lg text-sm no-underline transition-colors
  ${isActive ? 'font-semibold text-tint bg-surface' : 'font-normal text-muted'}`;

export function Sidebar() {
  const t = useT();

  return (
    <aside className="flex flex-col h-full w-14 md:w-[220px] shrink-0 border-r border-border bg-bg transition-[width]">
      <div className="px-2 md:px-5 pt-6 pb-4 overflow-hidden">
        <span className="text-2xl font-extrabold tracking-tight font-display text-fg">
          <span className="md:hidden">M</span>
          <span className="hidden md:inline">Mira<span className="text-accent"> TV</span></span>
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-1 md:px-2 flex-1">
        {NAV.map(({ to, icon: Icon, labelKey }) => (
          <NavLink key={to} to={to} className={navClass} title={t(labelKey)}>
            <Icon size={18} />
            <span className="hidden md:block">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-1 md:px-2 pb-4">
        <NavLink to="/settings" className={settingsClass} title={t('settings.title')}>
          <Settings size={18} />
          <span className="hidden md:block">{t('settings.title')}</span>
        </NavLink>
      </div>
    </aside>
  );
}
