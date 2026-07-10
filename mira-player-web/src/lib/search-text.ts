const COMBINING_MARKS_START = 0x0300;
const COMBINING_MARKS_END = 0x036f;

function stripDiacritics(value: string): string {
  let result = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < COMBINING_MARKS_START || code > COMBINING_MARKS_END) result += ch;
  }
  return result;
}

export function normalizeSearchText(value: string): string {
  return stripDiacritics(value.toLowerCase().normalize('NFD'));
}
