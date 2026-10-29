import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}));

import { verifyRequestSession } from './server-session';

describe('verifyRequestSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      mocks.getClaims.mockImplementation(async () => {
        options.cookies.setAll(
          [{ name: 'sb-session', value: 'refreshed', options: { sameSite: 'lax' } }],
          { 'Cache-Control': 'private, no-store' },
        );
        return { data: { claims: { sub: 'user-id' } }, error: null };
      });
      return { auth: { getClaims: mocks.getClaims } };
    });
  });

  it('accepts only claims verified by the Supabase server client', async () => {
    const result = await verifyRequestSession(
      new NextRequest('https://sakuramakeup.gt/admin'),
    );

    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(result.authenticated).toBe(true);
    expect(result.cookies).toEqual([
      { name: 'sb-session', value: 'refreshed', options: { sameSite: 'lax' } },
    ]);
    expect(result.headers['Cache-Control']).toBe('private, no-store');
  });

  it('fails closed when verification fails', async () => {
    mocks.getClaims.mockReset();
    mocks.createServerClient.mockReturnValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('invalid') }) },
    });

    const result = await verifyRequestSession(
      new NextRequest('https://sakuramakeup.gt/admin'),
    );

    expect(result.authenticated).toBe(false);
  });
});
