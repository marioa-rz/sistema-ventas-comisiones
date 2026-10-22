import { Inject, Injectable, Optional } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { JWTVerifyGetKey } from 'jose';
import { loadEnvironment } from '../config/environment';
import type { TokenVerifier, VerifiedToken } from './token-verifier';

export const SUPABASE_JWKS_RESOLVER = Symbol('SUPABASE_JWKS_RESOLVER');

@Injectable()
export class SupabaseJwtVerifier implements TokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwksUrl: URL;
  private keyResolver?: JWTVerifyGetKey;

  constructor(
    @Optional()
    @Inject(SUPABASE_JWKS_RESOLVER)
    jwksResolver?: JWTVerifyGetKey,
  ) {
    const environment = loadEnvironment();
    this.issuer = environment.supabaseJwtIssuer;
    this.audience = environment.supabaseJwtAudience;
    this.jwksUrl = new URL(environment.supabaseJwksUrl);
    this.keyResolver = jwksResolver;
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    this.keyResolver ??= createRemoteJWKSet(this.jwksUrl, {
      cacheMaxAge: 10 * 60 * 1_000,
      cooldownDuration: 30_000,
      timeoutDuration: 5_000,
    });

    const { payload } = await jwtVerify(token, this.keyResolver, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['ES256', 'RS256', 'EdDSA'],
      requiredClaims: ['sub', 'exp', 'iss', 'aud'],
    });

    if (typeof payload.sub !== 'string' || !isUUID(payload.sub)) {
      throw new Error('JWT subject is invalid');
    }
    return { subject: payload.sub };
  }
}
