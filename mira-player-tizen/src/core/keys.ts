export const Key = {
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  Enter: 13,
  Back: 10009, // tecla RETURN del remoto Samsung
  Escape: 27, // equivalente a Back en navegador
  MediaPlayPause: 10252,
  MediaPlay: 415,
  MediaPause: 19,
  MediaStop: 413,
  MediaRewind: 412,
  MediaFastForward: 417,
  ColorRed: 403,
  ColorGreen: 404,
  ColorYellow: 405,
  ColorBlue: 406,
} as const;

const MEDIA_KEYS = [
  'MediaPlayPause',
  'MediaPlay',
  'MediaPause',
  'MediaStop',
  'MediaRewind',
  'MediaFastForward',
  'ColorF0Red',
  'ColorF1Green',
  'ColorF2Yellow',
  'ColorF3Blue',
];

export function registerRemoteKeys(): void {
  const tvInput = (window as unknown as {
    tizen?: { tvinputdevice?: { registerKey(name: string): void } };
  }).tizen?.tvinputdevice;
  if (!tvInput) return;
  for (const name of MEDIA_KEYS) {
    try {
      tvInput.registerKey(name);
    } catch {
      // Tecla no soportada en este modelo; se ignora.
    }
  }
}

export function isBack(keyCode: number): boolean {
  return keyCode === Key.Back || keyCode === Key.Escape;
}
