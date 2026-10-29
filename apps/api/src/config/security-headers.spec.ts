import { describe, expect, it } from 'vitest';
import { securityHeadersFor } from './security-headers';

describe('securityHeadersFor', () => {
  it('locks down JSON API responses by default', () => {
    expect(securityHeadersFor('/api/orders')).toMatchObject({
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
  });

  it('allows only the local assets required by development Swagger UI', () => {
    const policy = securityHeadersFor('/api/docs')['Content-Security-Policy'];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain('https:');
  });
});
