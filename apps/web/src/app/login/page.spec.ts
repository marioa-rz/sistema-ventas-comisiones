import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('LoginPage password visibility', () => {
  it('provides an accessible control to show and hide the password', () => {
    expect(source).toContain("const [showPassword, setShowPassword] = useState(false)");
    expect(source).toContain("type={showPassword ? 'text' : 'password'}");
    expect(source).toContain('aria-label={showPassword ? \'Ocultar contraseña\' : \'Mostrar contraseña\'}');
  });

  it('replaces the login route after successful authentication', () => {
    expect(source).toContain("router.replace('/admin')");
    expect(source).toContain("router.replace('/seller')");
  });
});
