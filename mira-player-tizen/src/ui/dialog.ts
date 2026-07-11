import { el, escapeHtml } from './dom';
import { focusElement, currentFocus, handleNavKey } from '@/core/navigation';
import { isBack } from '@/core/keys';

function openOverlay(box: HTMLElement, defaultFocus: HTMLElement, onCancel: () => void): () => void {
  const previousFocus = currentFocus();
  const others = Array.from(document.querySelectorAll<HTMLElement>('.focusable'));
  for (const node of others) node.setAttribute('data-disabled', '');

  const overlay = el('div', { class: 'dialog-overlay anim-fade' }, [box]);
  const mount = document.getElementById('app') ?? document.body;
  mount.append(overlay);
  focusElement(defaultFocus);

  function onKey(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (isBack(e.keyCode)) {
      onCancel();
      return;
    }
    handleNavKey(e.keyCode);
  }
  document.addEventListener('keydown', onKey, true);

  return () => {
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    for (const node of others) node.removeAttribute('data-disabled');
    focusElement(previousFocus);
  };
}

export function confirmDialog(
  message: string,
  confirmLabel = 'Quitar',
  cancelLabel = 'Cancelar',
): Promise<boolean> {
  return new Promise((resolve) => {
    const cancelBtn = el('button', {
      class: 'focusable btn btn-secondary dialog-btn',
      html: escapeHtml(cancelLabel),
    });
    const confirmBtn = el('button', {
      class: 'focusable btn dialog-btn dialog-btn-danger',
      html: escapeHtml(confirmLabel),
    });
    const box = el('div', { class: 'dialog-box anim-scale' }, [
      el('p', { class: 'dialog-message', html: escapeHtml(message) }),
      el('div', { class: 'dialog-actions' }, [cancelBtn, confirmBtn]),
    ]);

    let close: () => void;
    const finish = (result: boolean) => {
      close();
      resolve(result);
    };
    cancelBtn.addEventListener('click', () => finish(false));
    confirmBtn.addEventListener('click', () => finish(true));
    close = openOverlay(box, cancelBtn, () => finish(false));
  });
}

export function profilePickerDialog(
  profiles: { id: string; nombre: string }[],
  activeId: string | null,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (profiles.length === 0) {
      resolve(null);
      return;
    }

    let close: () => void;
    const finish = (id: string | null) => {
      close();
      resolve(id);
    };

    const rows = profiles.map((p) => {
      const active = p.id === activeId;
      const row = el('button', {
        class: `focusable btn btn-secondary dialog-btn dialog-profile-row${active ? ' dialog-profile-row-active' : ''}`,
        html: active
          ? `${escapeHtml(p.nombre)}<span class="dialog-profile-tag">Activo</span>`
          : escapeHtml(p.nombre),
      });
      row.addEventListener('click', () => finish(p.id));
      return row;
    });

    const box = el('div', { class: 'dialog-box anim-scale' }, [
      el('p', { class: 'dialog-message', html: 'Cambiar de perfil' }),
      el('div', { class: 'dialog-list' }, rows),
    ]);

    close = openOverlay(box, rows[0]!, () => finish(null));
  });
}

export function alertDialog(message: string, okLabel = 'Aceptar'): Promise<void> {
  return new Promise((resolve) => {
    const okBtn = el('button', { class: 'focusable btn dialog-btn', html: escapeHtml(okLabel) });
    const box = el('div', { class: 'dialog-box anim-scale' }, [
      el('p', { class: 'dialog-message', html: escapeHtml(message) }),
      el('div', { class: 'dialog-actions' }, [okBtn]),
    ]);

    let close: () => void;
    const finish = () => {
      close();
      resolve();
    };
    okBtn.addEventListener('click', finish);
    close = openOverlay(box, okBtn, finish);
  });
}
