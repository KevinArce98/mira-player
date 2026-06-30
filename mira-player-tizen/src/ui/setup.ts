import { XtreamClient, XtreamError } from '@/core/xtream-client';
import { saveAccount } from '@/core/store';
import { focusFirst } from '@/core/navigation';
import { reset } from '@/core/router';
import type { Screen } from '@/core/router';
import { el } from './dom';
import { createHomeScreen } from './home';

export function createSetupScreen(): Screen {
  let busy = false;

  return {
    render(root) {
      const error = el('div', { class: 'error-banner', html: '' });
      error.style.display = 'none';

      const serverInput = el('input', {
        class: 'focusable',
        type: 'text',
        placeholder: 'http://servidor.com:8080',
      });
      const userInput = el('input', { class: 'focusable', type: 'text', placeholder: 'usuario' });
      const passInput = el('input', { class: 'focusable', type: 'password', placeholder: 'contraseña' });
      const submit = el('button', { class: 'focusable btn', html: 'Entrar' });

      async function doLogin(): Promise<void> {
        if (busy) return;
        const server = serverInput.value.trim();
        const username = userInput.value.trim();
        const password = passInput.value;
        if (!server || !username) {
          error.textContent = 'Completa servidor y usuario.';
          error.style.display = 'block';
          return;
        }
        busy = true;
        submit.textContent = 'Conectando…';
        error.style.display = 'none';
        try {
          const client = new XtreamClient({ server, username, password });
          await client.authenticate();
          saveAccount({ name: username, server, username, password });
          await reset(createHomeScreen);
        } catch (e) {
          const msg = e instanceof XtreamError ? e.message : 'Error inesperado al conectar.';
          error.textContent = msg;
          error.style.display = 'block';
          submit.textContent = 'Entrar';
          busy = false;
        }
      }

      submit.addEventListener('click', () => void doLogin());

      const card = el('div', { class: 'setup-card' }, [
        error,
        field('Servidor', serverInput),
        field('Usuario', userInput),
        field('Contraseña', passInput),
        el('div', { class: 'field' }, [submit]),
      ]);

      const screen = el('div', { class: 'screen setup' }, [
        el('div', { class: 'brand', html: 'MIRA<span class="dot">·</span>TV', style: 'font-size:48px;margin-bottom:8px' }),
        el('div', { class: 'screen-subtitle', html: 'Conecta tu cuenta Xtream Codes' }),
        card,
      ]);
      root.append(screen);
      focusFirst(screen);
    },
  };
}

function field(label: string, input: HTMLElement): HTMLElement {
  return el('div', { class: 'field' }, [el('label', { html: label }), input]);
}
