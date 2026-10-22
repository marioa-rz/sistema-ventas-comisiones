import { describe, expect, it } from 'vitest';
import { calculateCommissionLine } from './commission-calculator';

describe('calculateCommissionLine', () => {
  it.each([
    { price: '99.99', expectedRate: '0.1000', expectedAmount: '10.00' },
    { price: '100.00', expectedRate: '0.2000', expectedAmount: '20.00' },
    { price: '100.01', expectedRate: '0.2000', expectedAmount: '20.00' },
  ])('applies the commission threshold to Q$price', ({ price, expectedRate, expectedAmount }) => {
    expect(calculateCommissionLine(price, 1)).toEqual({
      subtotal: price,
      rate: expectedRate,
      commission: expectedAmount,
    });
  });

  it('multiplies quantity before rounding half up to cents', () => {
    expect(calculateCommissionLine('80.00', 2)).toEqual({
      subtotal: '160.00',
      rate: '0.1000',
      commission: '16.00',
    });
  });

  it.each([0, -1, 1.5])('rejects invalid quantity %s', (quantity) => {
    expect(() => calculateCommissionLine('80.00', quantity)).toThrow('quantity must be a positive integer');
  });

  it.each(['-0.01', 'not-money'])('rejects invalid unit price %s', (unitPrice) => {
    expect(() => calculateCommissionLine(unitPrice, 1)).toThrow('unit price must be a non-negative decimal');
  });
});
