import { XtreamClient } from './xtream-client';
import { Library } from './library';
import { accountKey, type StoredAccount } from './store';

export interface Session {
  account: StoredAccount;
  acctKey: string;
  client: XtreamClient;
  library: Library;
}

let session: Session | null = null;

export function initSession(account: StoredAccount): Session {
  const client = new XtreamClient(account);
  session = { account, acctKey: accountKey(account), client, library: new Library(client) };
  return session;
}

export function getSession(): Session {
  if (!session) throw new Error('Sesión no inicializada');
  return session;
}

export function clearSession(): void {
  session = null;
}
