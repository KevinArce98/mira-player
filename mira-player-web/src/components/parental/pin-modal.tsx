import { useEffect, useRef, useState } from 'react';

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
  if (!visible) return null;
  return <PinModalBody mode={mode} onClose={onClose} onSuccess={onSuccess} verify={verify} />;
}

function PinModalBody({ mode, onClose, onSuccess, verify }: Omit<PinModalProps, 'visible'>) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-bg p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold font-display text-fg text-center">{title}</h2>

        <div className="flex justify-center gap-4 cursor-text" onClick={() => inputRef.current?.focus()}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-tint border-tint' : 'border-border'}`}
            />
          ))}
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          maxLength={PIN_LENGTH}
          onChange={(e) => onChange(e.target.value)}
          className="absolute opacity-0 w-px h-px"
        />

        {error ? (
          <p className="text-sm text-danger text-center">{error}</p>
        ) : (
          <p className="text-sm text-muted text-center">{t('parental.pin.hint')}</p>
        )}

        <button
          onClick={onClose}
          className="self-center bg-transparent border-0 cursor-pointer text-sm font-semibold text-muted">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
