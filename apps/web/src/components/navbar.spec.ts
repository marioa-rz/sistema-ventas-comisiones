import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./navbar.tsx', import.meta.url), 'utf8');
const privateShellSource = readFileSync(new URL('./private-shell.tsx', import.meta.url), 'utf8');

describe('Navbar logout', () => {
  it('muestra una promesa comercial visible antes de navegar', () => {
    expect(source).toContain('Envíos a toda Guatemala');
    expect(source).toContain('Compra sin registrarte');
    expect(source).not.toContain('✦');
  });

  it('redirects deterministically after clearing the session', () => {
    expect(source).toContain("router.replace('/portal')");
    expect(source).toContain('await logout()');
  });

  it('exposes an accessible disabled state while logging out', () => {
    expect(source).toContain('aria-label="Cerrar sesión"');
    expect(source).toContain('disabled={isLoggingOut}');
  });

  it('uses the public brand treatment without catalog or cart actions', () => {
    expect(source).toContain('src="/sakura-brand.webp"');
    expect(source).toContain('sm:h-14 sm:w-48');
    expect(source).not.toContain('src="/sakura-logo.png"');
    expect(source).not.toContain('Catálogo & Ventas');
    expect(source).not.toContain('>\n            Catálogo\n          </Link>');
    expect(source).not.toContain('href="/cart"');
    expect(source).not.toContain('ShoppingBag');
    expect(source).not.toContain('useCart');
    expect(privateShellSource).not.toContain('CartProvider');
  });

  it('keeps role-specific navigation and logout actions', () => {
    expect(source).toContain('Mis Pedidos');
    expect(source).toContain('Panel Admin');
    expect(source).toContain('Cerrar sesión');
  });
});
