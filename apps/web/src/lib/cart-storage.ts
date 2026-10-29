export interface CartItem {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  price: string;
  quantity: number;
  imagePath?: string | null;
}

export function normalizeCartQuantity(quantity: number): number {
  return Math.min(100, Math.max(1, Math.trunc(quantity)));
}

export function parseStoredCart(stored: string): CartItem[] {
  let value: unknown;
  try {
    value = JSON.parse(stored) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.filter(isCartItem);
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const imagePath = item.imagePath;
  return (
    isNonEmptyString(item.variantId) &&
    isNonEmptyString(item.sku) &&
    isNonEmptyString(item.productName) &&
    isNonEmptyString(item.variantName) &&
    typeof item.price === 'string' &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) >= 0 &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) >= 1 &&
    Number(item.quantity) <= 100 &&
    (imagePath === undefined || imagePath === null || typeof imagePath === 'string')
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
