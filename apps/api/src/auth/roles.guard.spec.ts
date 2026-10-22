import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedRequest } from './authenticated-request';

function contextWithRole(role: 'ADMIN' | 'SELLER'): ExecutionContext {
  const request: AuthenticatedRequest = {
    headers: {},
    user: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      authUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      displayName: 'Usuario',
      role,
    },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => contextWithRole,
    getClass: () => RolesGuard,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows an administrator on an ADMIN route', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithRole('ADMIN'))).toBe(true);
  });

  it('rejects a seller on an ADMIN route', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextWithRole('SELLER'))).toThrow(ForbiddenException);
  });
});
