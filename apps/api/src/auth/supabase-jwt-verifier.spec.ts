import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier';

describe('SupabaseJwtVerifier', () => {
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
  let issuer: string;
  let previousEnvironment: NodeJS.ProcessEnv;
  let jwks: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    previousEnvironment = { ...process.env };
    const keys = await generateKeyPair('ES256');
    privateKey = keys.privateKey;
    const publicJwk = { ...(await exportJWK(keys.publicKey)), kid: 'test-key', alg: 'ES256' };
    jwks = createLocalJWKSet({ keys: [publicJwk] });
    issuer = 'https://project.supabase.co/auth/v1';

    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'test',
      SUPABASE_JWT_ISSUER: issuer,
      SUPABASE_JWT_AUDIENCE: 'authenticated',
      SUPABASE_JWKS_URL: `${issuer}/.well-known/jwks.json`,
    });
  });

  afterAll(async () => {
    process.env = previousEnvironment;
  });

  async function signToken(audience = 'authenticated'): Promise<string> {
    return new SignJWT({ role: 'ADMIN' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }

  it('verifies signature and required claims but returns only the subject', async () => {
    const verifier = new SupabaseJwtVerifier(jwks);

    await expect(verifier.verify(await signToken())).resolves.toEqual({
      subject: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
  });

  it('rejects a token issued for a different audience', async () => {
    const verifier = new SupabaseJwtVerifier(jwks);

    await expect(verifier.verify(await signToken('service_role'))).rejects.toThrow();
  });
});
