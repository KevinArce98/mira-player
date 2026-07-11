export interface PlaybackHandlers {
  onReady?: (durationMs: number) => void;
  onTime?: (currentMs: number) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onBuffering?: (active: boolean) => void;
}

export interface Player {
  play(url: string, handlers: PlaybackHandlers): void;
  pause(): void;
  resume(): void;
  togglePause(): boolean;
  seekBy(deltaMs: number): void;
  stop(): void;
  getState(): string;
}

const DISPLAY = { x: 0, y: 0, get w() { return window.innerWidth || 1920; }, get h() { return window.innerHeight || 1080; } };

function hasAvplay(): boolean {
  return typeof window.webapis !== 'undefined' && !!window.webapis?.avplay;
}

class AvplayPlayer implements Player {
  private paused = false;

  play(url: string, handlers: PlaybackHandlers): void {
    const av = window.webapis!.avplay;
    try {
      av.stop();
    } catch {
      // sin sesión previa
    }
    av.open(url);
    av.setDisplayRect(DISPLAY.x, DISPLAY.y, DISPLAY.w, DISPLAY.h);
    av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
    av.setListener({
      onbufferingstart: () => handlers.onBuffering?.(true),
      onbufferingcomplete: () => handlers.onBuffering?.(false),
      oncurrentplaytime: (t) => handlers.onTime?.(t),
      onstreamcompleted: () => handlers.onEnd?.(),
      onerror: (e) => handlers.onError?.(`AVPlay: ${e}`),
      onevent: () => {},
    });
    av.prepareAsync(
      () => {
        try {
          av.play();
          this.paused = false;
          handlers.onReady?.(av.getDuration());
        } catch (e) {
          handlers.onError?.(`No se pudo iniciar: ${String(e)}`);
        }
      },
      (e) => handlers.onError?.(`No se pudo preparar el stream: ${String(e)}`),
    );
  }

  pause(): void {
    try {
      window.webapis!.avplay.pause();
      this.paused = true;
    } catch {
      /* ignore */
    }
  }

  resume(): void {
    try {
      window.webapis!.avplay.play();
      this.paused = false;
    } catch {
      /* ignore */
    }
  }

  togglePause(): boolean {
    if (this.paused) this.resume();
    else this.pause();
    return this.paused;
  }

  seekBy(deltaMs: number): void {
    try {
      if (deltaMs >= 0) window.webapis!.avplay.jumpForward(deltaMs);
      else window.webapis!.avplay.jumpBackward(-deltaMs);
    } catch {
      /* live streams pueden no permitir seek */
    }
  }

  stop(): void {
    try {
      window.webapis!.avplay.stop();
      window.webapis!.avplay.close();
    } catch {
      /* ignore */
    }
  }

  getState(): string {
    try {
      return window.webapis!.avplay.getState();
    } catch {
      return 'NONE';
    }
  }
}

class VideoPlayer implements Player {
  private el: HTMLVideoElement;

  constructor() {
    let el = document.getElementById('fallback-video') as HTMLVideoElement | null;
    if (!el) {
      el = document.createElement('video');
      el.id = 'fallback-video';
      el.setAttribute('playsinline', '');
      el.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;background:#000;z-index:1';
      document.body.appendChild(el);
    }
    this.el = el;
  }

  play(url: string, handlers: PlaybackHandlers): void {
    this.el.style.display = 'block';
    this.el.src = url;
    this.el.onloadedmetadata = () => handlers.onReady?.((this.el.duration || 0) * 1000);
    this.el.ontimeupdate = () => handlers.onTime?.((this.el.currentTime || 0) * 1000);
    this.el.onended = () => handlers.onEnd?.();
    this.el.onwaiting = () => handlers.onBuffering?.(true);
    this.el.onplaying = () => handlers.onBuffering?.(false);
    this.el.onerror = () => handlers.onError?.('El navegador no puede reproducir este stream (usa la TV para AVPlay).');
    void this.el.play().catch((e) => handlers.onError?.(String(e)));
  }

  pause(): void {
    this.el.pause();
  }

  resume(): void {
    void this.el.play();
  }

  togglePause(): boolean {
    if (this.el.paused) {
      void this.el.play();
      return false;
    }
    this.el.pause();
    return true;
  }

  seekBy(deltaMs: number): void {
    this.el.currentTime = Math.max(0, this.el.currentTime + deltaMs / 1000);
  }

  stop(): void {
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    this.el.style.display = 'none';
  }

  getState(): string {
    return this.el.paused ? 'PAUSED' : 'PLAYING';
  }
}

let instance: Player | null = null;

export function getPlayer(): Player {
  if (!instance) instance = hasAvplay() ? new AvplayPlayer() : new VideoPlayer();
  return instance;
}

export function isNativePlayer(): boolean {
  return hasAvplay();
}
