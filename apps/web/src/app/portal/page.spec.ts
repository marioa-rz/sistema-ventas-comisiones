import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('PortalLoginPage accessibility and UX/UI contracts', () => {
  it('disables native HTML validation tooltips with noValidate', () => {
    expect(source).toContain('<form noValidate');
  });

  it('provides custom inline validation errors for email and password', () => {
    expect(source).toContain('id="login-email-error"');
    expect(source).toContain('id="login-password-error"');
    expect(source).toContain('role="alert"');
  });

  it('associates each invalid field with its rendered error', () => {
    expect(source).toContain("aria-describedby={emailError ? 'login-email-error' : 'login-email-help'}");
    expect(source).toContain("aria-describedby={passwordError ? 'login-password-error' : 'login-password-help'}");
  });

  it('keeps accessible password toggle with direct boolean state switch', () => {
    expect(source).toContain('onClick={() => setShowPassword((prev) => !prev)}');
    expect(source).toContain("aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}");
    expect(source).toContain("type={showPassword ? 'text' : 'password'}");
  });

  it('handles browser autofill by querying form elements directly on submit', () => {
    expect(source).toContain("form.elements.namedItem('email')");
    expect(source).toContain("form.elements.namedItem('password')");
  });

  it('does not expose local ports or development commands to users', () => {
    expect(source).not.toContain('puerto 3000');
    expect(source).not.toContain('npm run dev:api');
    expect(source).not.toContain('err.message ||');
    expect(source).toContain('getLoginErrorMessage(err)');
  });

  it('uses the shared allowlisted redirect resolver', () => {
    expect(source).toContain('resolvePortalDestination(user.role, redirectParam)');
    expect(source).toContain('resolvePortalDestination(loggedUser.role, redirectParam)');
  });
});
