const NAMES: Record<string, string> = {
  spa: 'Español',
  es: 'Español',
  esp: 'Español',
  lat: 'Español (Latino)',
  eng: 'Inglés',
  en: 'Inglés',
  por: 'Portugués',
  pt: 'Portugués',
  fra: 'Francés',
  fre: 'Francés',
  fr: 'Francés',
  deu: 'Alemán',
  ger: 'Alemán',
  de: 'Alemán',
  ita: 'Italiano',
  it: 'Italiano',
  jpn: 'Japonés',
  ja: 'Japonés',
  kor: 'Coreano',
  ko: 'Coreano',
  zho: 'Chino',
  chi: 'Chino',
  zh: 'Chino',
  rus: 'Ruso',
  ru: 'Ruso',
  ara: 'Árabe',
  ar: 'Árabe',
  hin: 'Hindi',
  und: 'Desconocido',
};

export function languageLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = code.trim().toLowerCase();
  return NAMES[key] ?? code.toUpperCase();
}
