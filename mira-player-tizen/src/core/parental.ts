const KEY = 'mira_tizen_parental';
const DEFAULT_PIN = '0000';

export interface ParentalSettings {
  adultEnabled: boolean;
  pin: string;
}

const DEFAULT_SETTINGS: ParentalSettings = { adultEnabled: false, pin: DEFAULT_PIN };

const ADULT_KEYWORDS = [
  'adult',
  'xxx',
  '+18',
  '18+',
  'porn',
  'hentai',
  'erotic',
  'erótic',
  'nsfw',
  'x-rated',
];

export function isAdultCategoryName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return ADULT_KEYWORDS.some((k) => n.includes(k));
}

export function loadParental(): ParentalSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ParentalSettings>;
    return {
      adultEnabled: Boolean(parsed.adultEnabled),
      pin: typeof parsed.pin === 'string' && /^\d{4}$/.test(parsed.pin) ? parsed.pin : DEFAULT_PIN,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveParental(settings: ParentalSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function isAdultEnabled(): boolean {
  return loadParental().adultEnabled;
}

export function verifyPin(pin: string): boolean {
  return loadParental().pin === pin;
}

export function setAdultEnabled(enabled: boolean, pin?: string): boolean {
  const current = loadParental();
  if (enabled && current.pin !== pin) return false;
  saveParental({ ...current, adultEnabled: enabled });
  return true;
}

export function setPin(newPin: string, currentPin: string): boolean {
  const current = loadParental();
  if (current.pin !== currentPin) return false;
  saveParental({ ...current, pin: newPin });
  return true;
}
