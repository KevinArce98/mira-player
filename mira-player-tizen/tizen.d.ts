interface AVPlayBufferingListener {
  onbufferingstart?: () => void;
  onbufferingprogress?: (percent: number) => void;
  onbufferingcomplete?: () => void;
}

interface AVPlayListener extends AVPlayBufferingListener {
  oncurrentplaytime?: (currentTime: number) => void;
  onstreamcompleted?: () => void;
  onevent?: (eventType: string, eventData: string | null) => void;
  onerror?: (eventType: string) => void;
  onsubtitlechange?: (duration: number, text: string) => void;
}

interface AVPlay {
  open(url: string): void;
  close(): void;
  prepare(): void;
  prepareAsync(success: () => void, error: (e: unknown) => void): void;
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(ms: number): void;
  jumpForward(ms: number): void;
  jumpBackward(ms: number): void;
  getState(): 'NONE' | 'IDLE' | 'READY' | 'PLAYING' | 'PAUSED';
  getDuration(): number;
  getCurrentTime(): number;
  setDisplayRect(x: number, y: number, width: number, height: number): void;
  setDisplayMethod(method: string): void;
  setListener(listener: AVPlayListener): void;
  setStreamingProperty(type: string, value: string): void;
}

interface WebApis {
  avplay: AVPlay;
}

interface TizenApplication {
  exit(): void;
  hide(): void;
}

interface TizenApplicationManager {
  getCurrentApplication(): TizenApplication;
}

interface Tizen {
  application: TizenApplicationManager;
}

declare global {
  interface Window {
    webapis?: WebApis;
    tizen?: Tizen;
  }
  const webapis: WebApis | undefined;
  const tizen: Tizen | undefined;
}

export {};
