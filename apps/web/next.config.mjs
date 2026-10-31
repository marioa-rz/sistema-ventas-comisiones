const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = [];
const frameSources = ["'self'"];
const scriptSources = ["'self'", "'unsafe-inline'"];
const connectSources = ["'self'", 'https:'];

if (process.env.NODE_ENV === 'development') {
  scriptSources.push("'unsafe-eval'");
  connectSources.push('http://localhost:3000');
}

if (supabaseUrl) {
  const storageUrl = new URL(supabaseUrl);
  if (storageUrl.protocol === 'https:') {
    frameSources.push(storageUrl.origin);
    remotePatterns.push({
      protocol: 'https',
      hostname: storageUrl.hostname,
      pathname: '/storage/v1/object/**',
    });
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  `frame-src ${frameSources.join(' ')}`,
  `script-src ${scriptSources.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(' ')}`,
  "upgrade-insecure-requests",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    unoptimized: true,
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
