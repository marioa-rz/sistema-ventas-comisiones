import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cartSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const confirmationSource = readFileSync(new URL('../order-confirmation/page.tsx', import.meta.url), 'utf8');

describe('checkout boundary', () => {
  it('sends only variant identity and quantity so the API owns pricing', () => {
    expect(cartSource).not.toContain('unitPrice: i.price');
  });

  it('keeps customer data and monetary values out of the confirmation URL', () => {
    expect(cartSource).toContain('/order-confirmation?code=${encodeURIComponent(result.publicCode)}');
    expect(cartSource).not.toContain('&total=${result.total}');
    expect(cartSource).not.toContain('&name=${encodeURIComponent');
    expect(confirmationSource).not.toContain("searchParams.get('name')");
    expect(confirmationSource).not.toContain("searchParams.get('total')");
  });
});
