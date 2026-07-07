type LogData = Record<string, unknown>;

function format(tag: string, data?: LogData): unknown[] {
  const ts = new Date().toISOString();
  return data ? [`${ts} [${tag}]`, data] : [`${ts} [${tag}]`];
}

export function logInfo(tag: string, data?: LogData): void {
  console.log(...format(tag, data));
}

export function logWarn(tag: string, data?: LogData): void {
  console.warn(...format(tag, data));
}

export function logError(tag: string, data?: LogData): void {
  console.error(...format(tag, data));
}
