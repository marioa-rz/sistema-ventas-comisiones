import { describe, expect, it } from 'vitest';
import { resolvePortalDestination } from './portal-routing';

describe('resolvePortalDestination', () => {
  it('allows the exact role-owned route and descendants', () => {
    expect(resolvePortalDestination('ADMIN', '/admin')).toBe('/admin');
    expect(resolvePortalDestination('ADMIN', '/admin?tab=users')).toBe('/admin?tab=users');
    expect(resolvePortalDestination('ADMIN', '/admin/users?active=true')).toBe('/admin/users?active=true');
    expect(resolvePortalDestination('SELLER', '/seller/orders')).toBe('/seller/orders');
  });

  it('rejects cross-role, external and lookalike destinations', () => {
    expect(resolvePortalDestination('ADMIN', '/seller')).toBe('/admin');
    expect(resolvePortalDestination('ADMIN', '//evil.example')).toBe('/admin');
    expect(resolvePortalDestination('ADMIN', '/administrator')).toBe('/admin');
    expect(resolvePortalDestination('SELLER', 'https://evil.example')).toBe('/seller');
  });

  it('rejects traversal, including encoded variants', () => {
    expect(resolvePortalDestination('ADMIN', '/admin/../seller')).toBe('/admin');
    expect(resolvePortalDestination('ADMIN', '/admin/%2e%2e/seller')).toBe('/admin');
    expect(resolvePortalDestination('ADMIN', '/admin/%252e%252e/seller')).toBe('/admin');
  });

  it('uses the role home without a requested destination', () => {
    expect(resolvePortalDestination('ADMIN', null)).toBe('/admin');
    expect(resolvePortalDestination('SELLER', null)).toBe('/seller');
  });
});
