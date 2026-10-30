import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cartSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const confirmationSource = readFileSync(new URL('../order-confirmation/page.tsx', import.meta.url), 'utf8');
const cartContextSource = readFileSync(new URL('../../lib/cart-context.tsx', import.meta.url), 'utf8');

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

  it('renders the stored product image with an initials fallback', () => {
    expect(cartSource).toContain("import Image from 'next/image'");
    expect(cartSource).toContain('item.imagePath ? (');
    expect(cartSource).toContain('src={item.imagePath}');
    expect(cartSource).toContain('sizes="56px"');
  });

  it('formats and validates Guatemalan phone numbers before checkout', () => {
    expect(cartSource).toContain('formatGuatemalanPhone(event.target.value)');
    expect(cartSource).toContain('isValidGuatemalanPhone(customerPhone)');
    expect(cartSource).toContain('getGuatemalanPhoneDigits(customerPhone)');
    expect(cartSource).toContain('pattern="[2-7][0-9]{3}-[0-9]{4}"');
  });

  it('uses an H1 for the empty cart state', () => {
    expect(cartSource).toContain('<h1 className="text-2xl font-bold text-white">Tu carrito está vacío</h1>');
  });

  it('uses a shopping bag icon for the empty cart state', () => {
    expect(cartSource).toContain('<ShoppingBag className="w-8 h-8" aria-hidden="true" />');
  });

  it('waits for persisted cart hydration before deciding that the cart is empty', () => {
    expect(cartContextSource).toContain('isInitialized: boolean;');
    expect(cartContextSource).toContain('value={{\n        items,\n        isInitialized,');
    expect(cartSource).toContain('if (!isInitialized || isRedirecting)');
    expect(cartSource.indexOf('if (!isInitialized || isRedirecting)')).toBeLessThan(
      cartSource.lastIndexOf('if (items.length === 0)'),
    );
  });

  it('keeps a progress state visible while navigating after checkout', () => {
    expect(cartSource).toContain('const [isRedirecting, setIsRedirecting] = useState(false)');
    expect(cartSource).toContain('setIsRedirecting(true);\n      clearCart();');
    expect(cartSource).toContain("isRedirecting ? 'Pedido confirmado' : 'Cargando tu carrito'");
    expect(cartSource).toContain('role="status"');
  });

  it('keeps the confirmation feedback visible briefly before navigating', () => {
    expect(cartSource).toContain('const CONFIRMATION_FEEDBACK_MS = 800;');
    expect(cartSource).toContain(
      'window.setTimeout(resolve, CONFIRMATION_FEEDBACK_MS);',
    );

    const redirectState = cartSource.indexOf('setIsRedirecting(true);');
    const feedbackDelay = cartSource.indexOf(
      'window.setTimeout(resolve, CONFIRMATION_FEEDBACK_MS);',
    );
    const navigation = cartSource.indexOf(
      'router.push(`/order-confirmation?code=${encodeURIComponent(result.publicCode)}`);',
    );

    expect(redirectState).toBeLessThan(feedbackDelay);
    expect(feedbackDelay).toBeLessThan(navigation);
  });

  it('exposes the selected payment method to assistive technology', () => {
    expect(cartSource).toContain('<fieldset>');
    expect(cartSource).toContain('<legend');
    expect(cartSource).toContain("aria-pressed={paymentMethod === 'CASH'}");
    expect(cartSource).toContain("aria-pressed={paymentMethod === 'TRANSFER'}");
  });
});
