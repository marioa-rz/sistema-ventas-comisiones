import { describe, expect, it } from 'vitest';
import {
  filterAdminOrders,
  firstDayOfLocalMonth,
  formatLocalDateInput,
  paymentVerificationAvailability,
} from './admin-view-model';

const baseOrder = {
  status: 'PENDING' as const,
  seller: { id: 'seller' },
  payment: {
    method: 'CASH' as const,
    status: 'PENDING' as const,
    cashReceivedAt: '2026-10-23T12:00:00.000Z',
    proofs: [],
  },
};

describe('admin payment actions', () => {
  it('requires received cash', () => {
    const result = paymentVerificationAvailability({
      ...baseOrder,
      payment: { ...baseOrder.payment, cashReceivedAt: null },
    });
    expect(result.canVerify).toBe(false);
    expect(result.reason).toContain('efectivo');
  });

  it('requires a pending transfer proof', () => {
    const result = paymentVerificationAvailability({
      ...baseOrder,
      payment: { ...baseOrder.payment, method: 'TRANSFER', cashReceivedAt: null },
    });
    expect(result.canVerify).toBe(false);
    expect(result.reason).toContain('comprobante');
  });

  it('allows a pending transfer proof', () => {
    const result = paymentVerificationAvailability({
      ...baseOrder,
      payment: {
        ...baseOrder.payment,
        method: 'TRANSFER',
        cashReceivedAt: null,
        proofs: [{ reviewStatus: 'PENDING' }],
      },
    });
    expect(result).toEqual({ canVerify: true, reason: null });
  });
});

describe('admin report dates', () => {
  it('uses local calendar components', () => {
    const date = new Date(2026, 9, 23, 23, 30);
    expect(formatLocalDateInput(date)).toBe('2026-10-23');
    expect(firstDayOfLocalMonth(date)).toBe('2026-10-01');
  });
});

describe('admin order search', () => {
  const orders = [
    { publicCode: 'VNT-TZA178', status: 'PENDING' as const },
    { publicCode: 'VNT-480ZDL', status: 'CONFIRMED' as const },
  ];

  it('finds a sale by a case-insensitive partial code', () => {
    expect(filterAdminOrders(orders, 'ALL', 'tza178')).toEqual([orders[0]]);
  });

  it('preserves the selected status filter when the search is empty', () => {
    expect(filterAdminOrders(orders, 'CONFIRMED', '')).toEqual([orders[1]]);
  });
});
