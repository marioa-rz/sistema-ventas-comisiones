import Decimal from 'decimal.js';

export interface CommissionLine {
  subtotal: string;
  rate: string;
  commission: string;
}

export function calculateCommissionLine(unitPrice: string, quantity: number): CommissionLine {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('quantity must be a positive integer');
  }

  let price: Decimal;
  try {
    price = new Decimal(unitPrice);
  } catch {
    throw new Error('unit price must be a non-negative decimal');
  }

  if (!price.isFinite() || price.isNegative()) {
    throw new Error('unit price must be a non-negative decimal');
  }

  const rate = price.lessThan(100) ? new Decimal('0.1000') : new Decimal('0.2000');
  const subtotal = price.mul(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const commission = subtotal.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subtotal: subtotal.toFixed(2),
    rate: rate.toFixed(4),
    commission: commission.toFixed(2),
  };
}
