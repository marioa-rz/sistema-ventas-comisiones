import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./navbar.tsx', import.meta.url), 'utf8');

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
});
