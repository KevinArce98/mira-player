import { Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { runSync } from '@/services/sync/engine';
import { ensureSyncBootstrapped } from '@/services/sync/bootstrap';
import { getAccount } from '@/db/repositories/accounts';
import { applyReauthReset, isReauthPending } from '@/services/session-reauth';

import { ParentalProvider } from '@/providers/parental';
import { PreferencesProvider } from '@/providers/preferences';
import { queryClient } from '@/lib/query-client';
import { Sidebar } from '@/components/layout/sidebar';
import { Loading } from '@/components/ui/empty';

import { SetupPage } from '@/pages/setup';
import { HomePage } from '@/pages/home';
import { LivePage } from '@/pages/live';
import { CatalogPage } from '@/pages/catalog';
import { SearchPage } from '@/pages/search';
import { SettingsPage } from '@/pages/settings';
import { ContentDetailPage } from '@/pages/content-detail';
import { PlayerPage } from '@/pages/player';
import { AuthGuard } from '@/components/layout/auth-guard';

function AppLayout() {
  if (isReauthPending()) return <Navigate to="/setup" replace />;
  return (
    <div className="flex h-full bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  useEffect(() => {
    void (async () => {
      if (isReauthPending()) {
        const account = await getAccount();
        await applyReauthReset(account?.id ?? null);
        return; // AuthGuard/AppLayout route to /setup until re-login
      }
      await ensureSyncBootstrapped();
      await runSync();
    })();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <ParentalProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<AuthGuard />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/player" element={<PlayerPage />} />
              <Route element={<AppLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/live" element={<LivePage />} />
                <Route
                  path="/movies"
                  element={<CatalogPage tipo="movie" titleKey="movies.title" />}
                />
                <Route
                  path="/series"
                  element={<CatalogPage tipo="series" titleKey="series.title" />}
                />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/content/:id" element={<ContentDetailPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ParentalProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
