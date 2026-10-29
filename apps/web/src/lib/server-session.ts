import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

export interface SessionCookieUpdate {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface SessionVerification {
  authenticated: boolean;
  cookies: SessionCookieUpdate[];
  headers: Record<string, string>;
}

export async function verifyRequestSession(request: NextRequest): Promise<SessionVerification> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const cookieUpdates: SessionCookieUpdate[] = [];
  const responseHeaders: Record<string, string> = {};

  if (!supabaseUrl || !supabaseKey) {
    return { authenticated: false, cookies: cookieUpdates, headers: responseHeaders };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookieUpdates.push(...cookiesToSet);
        Object.assign(responseHeaders, headers);
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getClaims();
    return {
      authenticated: !error && typeof data?.claims?.sub === 'string',
      cookies: cookieUpdates,
      headers: responseHeaders,
    };
  } catch {
    return { authenticated: false, cookies: cookieUpdates, headers: responseHeaders };
  }
}
