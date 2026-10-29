import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, routeRequest } from './middleware';

function createRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const request = new NextRequest(new URL(path, 'https://sakuramakeup.gt'));
  for (const [name, value] of Object.entries(cookies)) request.cookies.set(name, value);
  return request;
}

describe('route protection middleware', () => {
  it('redirects unauthenticated admin requests to the portal', async () => {
    const response = await middleware(createRequest('/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sakuramakeup.gt/portal?redirect=%2Fadmin');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('ignores forged legacy token and role cookies', async () => {
    const response = await middleware(createRequest('/admin', {
      sakura_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjIwMDAwMDAwMDAsInN1YiI6ImF0dGFja2VyIn0.forged',
      sakura_role: 'ADMIN',
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/portal?redirect=');
    expect(response.headers.get('set-cookie')).toContain('sakura_token=;');
    expect(response.headers.get('set-cookie')).toContain('sakura_role=;');
  });

  it('allows a server-verified identity to render either private shell', () => {
    for (const path of ['/admin', '/seller']) {
      const response = routeRequest(createRequest(path), true);
      expect(response.status).toBe(200);
      expect(response.headers.get('x-robots-tag')).toContain('noindex');
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  });

  it('does not infer a role for an authenticated visitor on the portal', () => {
    const response = routeRequest(createRequest('/portal'), true);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects the legacy login route while preserving an internal destination', async () => {
    const response = await middleware(createRequest('/login?redirect=%2Fadmin%2Fusers'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sakuramakeup.gt/portal?redirect=%2Fadmin%2Fusers');
  });

  it('keeps security headers on public routes', async () => {
    const response = await middleware(createRequest('/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});
