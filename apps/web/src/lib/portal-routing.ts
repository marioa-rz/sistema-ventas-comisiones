import type { CommercialUser } from './auth-context';

export function resolvePortalDestination(
  role: CommercialUser['role'],
  redirectParam: string | null,
): '/admin' | '/seller' | string {
  const home = role === 'ADMIN' ? '/admin' : '/seller';
  if (!redirectParam) return home;

  let decodedPath = redirectParam.split(/[?#]/, 1)[0].replace(/\\/g, '/');
  for (let pass = 0; pass < 3; pass += 1) {
    if (decodedPath.split('/').includes('..')) return home;
    try {
      const next = decodeURIComponent(decodedPath).replace(/\\/g, '/');
      if (next === decodedPath) break;
      decodedPath = next;
    } catch {
      return home;
    }
  }
  if (decodedPath.split('/').includes('..')) return home;

  let destination: URL;
  try {
    destination = new URL(redirectParam, 'https://internal.invalid');
  } catch {
    return home;
  }
  if (destination.origin !== 'https://internal.invalid') return home;

  const ownedPrefix = role === 'ADMIN' ? '/admin' : '/seller';
  const ownsDestination =
    destination.pathname === ownedPrefix || destination.pathname.startsWith(`${ownedPrefix}/`);

  return ownsDestination ? redirectParam : home;
}
