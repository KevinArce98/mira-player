import './ui/theme.css';
import './ui/app.css';

import { initRouter, reset, activeScreen, back } from '@/core/router';
import { handleNavKey } from '@/core/navigation';
import { registerRemoteKeys, isBack } from '@/core/keys';
import { loadAccount } from '@/core/store';
import { createSetupScreen } from '@/ui/setup';
import { createHomeScreen } from '@/ui/home';

function exitApp(): void {
  try {
    window.tizen?.application.getCurrentApplication().exit();
  } catch {
    /* en navegador no hace nada */
  }
}

function onKeyDown(e: KeyboardEvent): void {
  const keyCode = e.keyCode;

  // 1) La pantalla activa tiene prioridad (p.ej. el reproductor).
  if (activeScreen()?.onKey?.(keyCode)) {
    e.preventDefault();
    return;
  }

  // 2) Botón Atrás: retrocede en la pila o sale en la raíz.
  if (isBack(keyCode)) {
    e.preventDefault();
    void back().then((moved) => {
      if (!moved) exitApp();
    });
    return;
  }

  // 3) Navegación espacial (flechas + OK).
  if (handleNavKey(keyCode)) {
    e.preventDefault();
  }
}

function showFatalError(msg: string): void {
  const root = document.getElementById('app');
  if (root) {
    root.innerHTML = `<div style="color:#fff;background:#c0392b;padding:40px;font-size:28px;font-family:monospace;white-space:pre-wrap;position:fixed;inset:0;z-index:9999;overflow:auto">${msg}</div>`;
  }
}

function scaleToViewport(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!vw || !vh) return;
  const scale = Math.min(vw / 1920, vh / 1080);
  if (Math.abs(scale - 1) > 0.01) {
    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = '0 0';
  }
}

function boot(): void {
  window.addEventListener('error', (e) => showFatalError(`JS Error:\n${e.message}\n${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => showFatalError(`Unhandled Promise:\n${String(e.reason)}`));

  scaleToViewport();
  registerRemoteKeys();
  const root = document.getElementById('app');
  if (!root) throw new Error('Falta #app en el DOM');
  initRouter(root);
  document.addEventListener('keydown', onKeyDown);

  void reset(loadAccount() ? createHomeScreen : createSetupScreen);
}

boot();
