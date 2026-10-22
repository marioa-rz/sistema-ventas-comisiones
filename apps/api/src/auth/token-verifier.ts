export interface VerifiedToken {
  subject: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
