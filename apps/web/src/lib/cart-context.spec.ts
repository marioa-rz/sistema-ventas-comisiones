import { describe, expect, it } from 'vitest';

const cartStorage = await import('./cart-storage').catch(() => ({}));
const parseStoredCart = (cartStorage as { parseStoredCart?: (value: string) => unknown }).parseStoredCart;
const normalizeCartQuantity = (cartStorage as { normalizeCartQuantity?: (value: number) => number }).normalizeCartQuantity;

describe('parseStoredCart', () => {
  it('keeps only structurally valid cart items', () => {
    const valid = {
      variantId: 'variant-1',
      sku: 'SKU-1',
      productName: 'Labial',
      variantName: 'Rosa',
      price: '80.00',
      quantity: 2,
      imagePath: null,
    };

    expect(parseStoredCart?.(JSON.stringify([valid, { broken: true }]))).toEqual([valid]);
  });

  it.each(['not-json', '{}', 'null'])('returns an empty cart for invalid persisted data: %s', (stored) => {
    expect(parseStoredCart?.(stored)).toEqual([]);
  });
});

describe('normalizeCartQuantity', () => {
  it('caps a variant at the API aggregate limit', () => {
    expect(normalizeCartQuantity?.(101)).toBe(100);
    expect(normalizeCartQuantity?.(2)).toBe(2);
  });
});
