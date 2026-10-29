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

  it('associates persistent help and errors with checkout fields', () => {
    expect(cartSource).toContain('htmlFor="customer-name"');
    expect(cartSource).toContain('id="customer-name"');
    expect(cartSource).toContain('aria-describedby="customer-name-help"');
    expect(cartSource).toContain('role="alert"');
  });

  it('uses an H1 for the empty cart state', () => {
    expect(cartSource).toContain('<h1 className="text-2xl font-bold text-white">Tu carrito está vacío</h1>');
  });

  it('exposes the selected payment method to assistive technology', () => {
    expect(cartSource).toContain('<fieldset>');
    expect(cartSource).toContain('<legend');
    expect(cartSource).toContain("aria-pressed={paymentMethod === 'CASH'}");
    expect(cartSource).toContain("aria-pressed={paymentMethod === 'TRANSFER'}");
  });
});
