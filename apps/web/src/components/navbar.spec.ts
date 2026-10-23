import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./navbar.tsx', import.meta.url), 'utf8');

describe('Navbar logout', () => {
  it('redirects deterministically after clearing the session', () => {
    expect(source).toContain("router.replace('/login')");
    expect(source).toContain('await logout()');
  });

  it('exposes an accessible disabled state while logging out', () => {
    expect(source).toContain('aria-label="Cerrar sesión"');
    expect(source).toContain('disabled={isLoggingOut}');
  });
});
