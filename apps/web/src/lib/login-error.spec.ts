import { describe, expect, it } from 'vitest';
import { getLoginErrorMessage } from './login-error';

describe('getLoginErrorMessage', () => {
  it('maps expected authentication states to safe messages', () => {
    expect(getLoginErrorMessage({ statusCode: 403 })).toContain('desactivado');
    expect(getLoginErrorMessage({ status: 401 })).toContain('Credenciales incorrectas');
    expect(getLoginErrorMessage({ statusCode: 0 })).toContain('No se pudo conectar');
  });

  it('never exposes an unclassified upstream message', () => {
    const secretDetail = 'Database host db.internal failed with stack trace';
    const message = getLoginErrorMessage({ status: 500, message: secretDetail });

    expect(message).toBe('No se pudo iniciar sesión. Inténtalo de nuevo.');
    expect(message).not.toContain(secretDetail);
  });
});
