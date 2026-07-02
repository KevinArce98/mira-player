import { resetFocus } from './navigation';

export interface Screen {
  render(root: HTMLElement): void | Promise<void>;
  // Maneja una tecla antes de la navegación espacial. Devuelve true si la consume.
  onKey?(keyCode: number): boolean;
  onExit?(): void;
}

type ScreenFactory = () => Screen;

const stack: Screen[] = [];
let mount: HTMLElement;

export function initRouter(root: HTMLElement): void {
  mount = root;
}

async function show(screen: Screen): Promise<void> {
  resetFocus();
  mount.innerHTML = '';
  await screen.render(mount);
}

export async function navigate(factory: ScreenFactory): Promise<void> {
  const screen = factory();
  stack.push(screen);
  await show(screen);
}

// Reemplaza toda la pila (p.ej. login -> home, sin volver atrás al login).
export async function reset(factory: ScreenFactory): Promise<void> {
  while (stack.length) stack.pop()?.onExit?.();
  await navigate(factory);
}

// Reemplaza solo la pantalla activa (p.ej. episodio actual -> siguiente
// episodio), sin apilar una entrada nueva ni afectar el resto de la pila.
export async function replace(factory: ScreenFactory): Promise<void> {
  stack.pop()?.onExit?.();
  const screen = factory();
  stack.push(screen);
  await show(screen);
}

export async function back(): Promise<boolean> {
  if (stack.length <= 1) return false;
  stack.pop()?.onExit?.();
  const prev = stack[stack.length - 1];
  await show(prev);
  return true;
}

export function activeScreen(): Screen | undefined {
  return stack[stack.length - 1];
}
