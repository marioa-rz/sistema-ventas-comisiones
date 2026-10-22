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
});
