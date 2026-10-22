import { UnauthorizedException } from '@nestjs/common';

export function extractBearerToken(authorization: string | undefined): string {
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match?.[1]) {
    throw new UnauthorizedException('Missing or malformed bearer token');
  }
  return match[1];
}
