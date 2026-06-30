import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Tv, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSaveAccount } from '@/hooks/data/use-account';
import { useT } from '@/providers/preferences';

const inputClass =
  'w-full bg-surface text-fg border border-border rounded-lg px-3.5 py-2.5 text-base outline-none';

export function SetupPage() {
  const t = useT();
  const navigate = useNavigate();
  const save = useSaveAccount();

  const [servidor, setServidor] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const canSubmit = servidor.trim() && usuario.trim() && password.trim() && !save.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(
      { servidor: servidor.trim(), usuario: usuario.trim(), password },
      { onSuccess: () => void navigate('/home', { replace: true }) },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Tv size={48} className="text-accent" />
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-fg">
            Mira<span className="text-accent"> TV</span>
          </h1>
        </div>

        <h2 className="text-lg font-semibold text-center mb-1 text-fg">{t('setup.connect')}</h2>
        <p className="text-sm text-center mb-6 text-muted">{t('setup.subtitle')}</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-fg">{t('setup.server')}</label>
            <input
              type="url"
              placeholder="http://host:puerto"
              value={servidor}
              onChange={(e) => setServidor(e.target.value)}
              className={inputClass}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-fg">{t('setup.user')}</label>
            <input
              type="text"
              placeholder="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className={inputClass}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-fg">{t('setup.password')}</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-muted flex"
                aria-label={showPwd ? t('setup.hidePassword') : t('setup.showPassword')}>
                {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {save.isError ? (
            <p className="text-sm text-danger">
              {save.error instanceof Error ? save.error.message : t('setup.connectError')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 py-3 rounded-lg text-base font-bold transition-opacity bg-tint text-on-tint border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {save.isPending ? <Loader2 size={20} className="animate-spin" /> : t('setup.submit')}
          </button>

          <p className="text-xs text-center text-muted">{t('setup.note')}</p>
        </form>
      </div>
    </div>
  );
}
