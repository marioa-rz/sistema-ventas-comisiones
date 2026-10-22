import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TokenVerifier } from './token-verifier';
import { AuthenticationService } from './authentication.service';
import type { UsersService } from '../users/users.service';

describe('AuthenticationService', () => {
  it('returns the active server-controlled profile for the verified subject', async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValue({ subject: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    } satisfies TokenVerifier;
    const profile = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      displayName: 'Vendedora de prueba',
      role: 'SELLER' as const,
    };
    const users = { findActiveByAuthUserId: vi.fn().mockResolvedValue(profile) } as unknown as UsersService;

    const service = new AuthenticationService(verifier, users);

    await expect(service.authenticate('signed.jwt')).resolves.toEqual(profile);
    expect(users.findActiveByAuthUserId).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('rejects a valid token without an active application profile', async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValue({ subject: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    } satisfies TokenVerifier;
    const users = { findActiveByAuthUserId: vi.fn().mockResolvedValue(null) } as unknown as UsersService;

    const service = new AuthenticationService(verifier, users);

    await expect(service.authenticate('signed.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes verification failures without exposing cryptographic details', async () => {
    const verifier = {
      verify: vi.fn().mockRejectedValue(new Error('signature mismatch for key abc')),
    } satisfies TokenVerifier;
    const users = { findActiveByAuthUserId: vi.fn() } as unknown as UsersService;

    const service = new AuthenticationService(verifier, users);

    await expect(service.authenticate('bad.jwt')).rejects.toMatchObject({ message: 'Invalid access token' });
    expect(users.findActiveByAuthUserId).not.toHaveBeenCalled();
  });
});
