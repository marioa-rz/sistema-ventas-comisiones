const STORAGE_KEY = 'sakura-checkout-attempt';

interface CheckoutAttempt {
  fingerprint: string;
  key: string;
}

type CheckoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getCheckoutIdempotencyKey(
  storage: CheckoutStorage,
  fingerprint: string,
  createKey: () => string = () => crypto.randomUUID(),
) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      const attempt = JSON.parse(stored) as Partial<CheckoutAttempt>;
      if (attempt.fingerprint === fingerprint && typeof attempt.key === 'string') {
        return attempt.key;
      }
    }
  } catch {
    // Un valor corrupto o almacenamiento bloqueado no debe impedir el checkout.
  }

  const key = createKey();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint, key } satisfies CheckoutAttempt));
  } catch {
    // La API todavía protege el intento actual aunque el navegador no permita persistirlo.
  }
  return key;
}

export function clearCheckoutIdempotencyKey(storage: CheckoutStorage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // No hay nada más que limpiar si el almacenamiento está bloqueado.
  }
}
