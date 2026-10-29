export function securityHeadersFor(requestUrl = ''): Record<string, string> {
  const contentSecurityPolicy = requestUrl.startsWith('/api/docs')
    ? "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

  return {
    'Content-Security-Policy': contentSecurityPolicy,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
