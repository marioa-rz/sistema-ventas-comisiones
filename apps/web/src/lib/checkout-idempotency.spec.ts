import { describe, expect, it } from 'vitest';
import { clearCheckoutIdempotencyKey, getCheckoutIdempotencyKey } from './checkout-idempotency';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe('checkout idempotency persistence', () => {
  it('reuses the key after a reload for the same logical request', () => {
    const storage = memoryStorage();
    const first = getCheckoutIdempotencyKey(storage, 'same-request', () => 'key-1');
    const retry = getCheckoutIdempotencyKey(storage, 'same-request', () => 'key-2');
    expect(first).toBe('key-1');
    expect(retry).toBe('key-1');
  });

  it('rotates the key when the request changes and clears it after success', () => {
    const storage = memoryStorage();
    getCheckoutIdempotencyKey(storage, 'request-a', () => 'key-a');
    expect(getCheckoutIdempotencyKey(storage, 'request-b', () => 'key-b')).toBe('key-b');
    clearCheckoutIdempotencyKey(storage);
    expect(getCheckoutIdempotencyKey(storage, 'request-b', () => 'key-c')).toBe('key-c');
  });
});
