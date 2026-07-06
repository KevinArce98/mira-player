import { describe, it, expect } from 'vitest';
import { mergeProgress, mergeFavorite, mergePreference } from './merge.js';

describe('mergeProgress', () => {
  it('creates from null', () => {
    const r = mergeProgress(null, {
      posicionSegundos: 100,
      duracionTotal: 500,
      completado: false,
      lastWatchedAt: 10,
      deletedAt: null,
    });
    expect(r.posicionSegundos).toBe(100);
  });

  it('takes MAX position, ignoring a lower incoming (clock skew resistant)', () => {
    const current = { posicionSegundos: 5400, duracionTotal: 5600, completado: false, lastWatchedAt: 200, deletedAt: null };
    const incoming = { posicionSegundos: 2700, duracionTotal: 5600, completado: false, lastWatchedAt: 999, deletedAt: null };
    const r = mergeProgress(current, incoming);
    expect(r.posicionSegundos).toBe(5400);
  });

  it('completado is OR (once true stays true)', () => {
    const current = { posicionSegundos: 5600, duracionTotal: 5600, completado: true, lastWatchedAt: 100, deletedAt: null };
    const incoming = { posicionSegundos: 10, duracionTotal: 5600, completado: false, lastWatchedAt: 200, deletedAt: null };
    const r = mergeProgress(current, incoming);
    expect(r.completado).toBe(true);
    expect(r.posicionSegundos).toBe(5600);
  });

  it('explicit reset clears position and completado', () => {
    const current = { posicionSegundos: 5600, duracionTotal: 5600, completado: true, lastWatchedAt: 100, deletedAt: null };
    const r = mergeProgress(current, {
      posicionSegundos: 0,
      duracionTotal: 5600,
      completado: false,
      lastWatchedAt: 300,
      deletedAt: null,
      reset: true,
    });
    expect(r.posicionSegundos).toBe(0);
    expect(r.completado).toBe(false);
  });

  it('duracionTotal is LWW (incoming when provided)', () => {
    const current = { posicionSegundos: 10, duracionTotal: 500, completado: false, lastWatchedAt: 100, deletedAt: null };
    const r = mergeProgress(current, {
      posicionSegundos: 20,
      duracionTotal: 999,
      completado: false,
      lastWatchedAt: 200,
      deletedAt: null,
    });
    expect(r.duracionTotal).toBe(999);
  });
});

describe('mergeFavorite tombstone', () => {
  it('newer deletion wins', () => {
    const r = mergeFavorite({ createdAt: 100, deletedAt: null }, { createdAt: 100, deletedAt: 200 });
    expect(r.deletedAt).toBe(200);
  });
  it('re-add after delete (newer createdAt, no deletion) revives', () => {
    const r = mergeFavorite({ createdAt: 100, deletedAt: 150 }, { createdAt: 300, deletedAt: null });
    expect(r.deletedAt).toBe(null);
  });
});

describe('mergePreference LWW by client clock', () => {
  it('newer client wins', () => {
    const r = mergePreference(
      { valor: 'dark', clientUpdatedAt: 100, deletedAt: null },
      { valor: 'light', clientUpdatedAt: 200, deletedAt: null },
    );
    expect(r.valor).toBe('light');
  });
  it('older client is ignored', () => {
    const r = mergePreference(
      { valor: 'dark', clientUpdatedAt: 300, deletedAt: null },
      { valor: 'light', clientUpdatedAt: 200, deletedAt: null },
    );
    expect(r.valor).toBe('dark');
  });
});
