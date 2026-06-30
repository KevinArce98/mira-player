import { getPassword } from '@/services/credentials';
import { XtreamClient, XtreamError } from '@/services/xtream/client';
import type { Cuenta } from '@/types/models';

export async function clientFromAccount(cuenta: Cuenta): Promise<XtreamClient> {
  const password = getPassword(cuenta.id);
  if (!password) {
    throw new XtreamError('No se encontró el password de la cuenta en el almacenamiento local.');
  }
  return new XtreamClient({
    server: cuenta.servidor,
    username: cuenta.usuario,
    password,
  });
}
