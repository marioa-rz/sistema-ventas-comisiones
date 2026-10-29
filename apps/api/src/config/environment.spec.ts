import { describe, expect, it } from 'vitest';
import { loadEnvironment } from './environment';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
  SUPABASE_JWT_AUDIENCE: 'authenticated',
  SUPABASE_JWKS_URL: 'https://project.supabase.co/auth/v1/.well-known/jwks.json',
};

describe('loadEnvironment', () => {
  it('loads the trusted Supabase JWT configuration', () => {
    expect(loadEnvironment(validEnvironment)).toMatchObject({
      supabaseJwtIssuer: validEnvironment.SUPABASE_JWT_ISSUER,
      supabaseJwtAudience: 'authenticated',
      supabaseJwksUrl: validEnvironment.SUPABASE_JWKS_URL,
    });
  });

  it('rejects a JWKS URL that does not belong to the configured issuer', () => {
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        SUPABASE_JWKS_URL: 'https://attacker.example/.well-known/jwks.json',
      }),
    ).toThrow('SUPABASE_JWKS_URL must be the discovery endpoint for SUPABASE_JWT_ISSUER');
  });

  it('requires an explicit trusted proxy hop count in production', () => {
    expect(() => loadEnvironment({ ...validEnvironment, NODE_ENV: 'production' })).toThrow(
      'TRUST_PROXY_HOPS must be configured in production',
    );
    expect(loadEnvironment({
      ...validEnvironment,
      NODE_ENV: 'production',
      TRUST_PROXY_HOPS: '1',
      CORS_ORIGIN: 'https://sakura.example',
    })).toMatchObject({ trustProxyHops: 1 });
  });

  it('requires an explicit HTTPS CORS allowlist in production', () => {
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        TRUST_PROXY_HOPS: '1',
      }),
    ).toThrow('CORS_ORIGIN must be configured in production');

    expect(
      loadEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        TRUST_PROXY_HOPS: '1',
        CORS_ORIGIN: 'https://sakura.example',
      }).corsOrigins,
    ).toEqual(['https://sakura.example']);
  });

  it('rejects wildcard and non-HTTPS production CORS origins', () => {
    const productionEnvironment = {
      ...validEnvironment,
      NODE_ENV: 'production',
      TRUST_PROXY_HOPS: '1',
    };

    expect(() => loadEnvironment({ ...productionEnvironment, CORS_ORIGIN: '*' })).toThrow(
      'CORS_ORIGIN must contain explicit HTTPS origins in production',
    );
    expect(() =>
      loadEnvironment({ ...productionEnvironment, CORS_ORIGIN: 'http://sakura.example' }),
    ).toThrow('CORS_ORIGIN must contain explicit HTTPS origins in production');
  });
});
