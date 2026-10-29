import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nextConfig = readFileSync(new URL('../../next.config.mjs', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../../../../.gitignore', import.meta.url), 'utf8');
const rootLayout = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
const robots = readFileSync(new URL('./robots.ts', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('./sitemap.ts', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../components/footer.tsx', import.meta.url), 'utf8');
const adminMetadata = readFileSync(new URL('./admin/layout.tsx', import.meta.url), 'utf8');
const sellerMetadata = readFileSync(new URL('./seller/layout.tsx', import.meta.url), 'utf8');
const appShell = readFileSync(new URL('../components/app-shell.tsx', import.meta.url), 'utf8');
const legalNotice = readFileSync(new URL('./aviso-legal/page.tsx', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('./privacidad/page.tsx', import.meta.url), 'utf8');
const cookies = readFileSync(new URL('./cookies/page.tsx', import.meta.url), 'utf8');

describe('Next.js build asset isolation', () => {
  it('keeps development assets separate from production builds', () => {
    expect(nextConfig).toContain("distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'");
    expect(gitignore).toContain('.next-dev/');
  });

  it('sets public security headers and limits remote images to configured HTTPS hosts', () => {
    expect(nextConfig).toContain('Content-Security-Policy');
    expect(nextConfig).toContain('X-Content-Type-Options');
    expect(nextConfig).toContain('Referrer-Policy');
    expect(nextConfig).toContain('Permissions-Policy');
    expect(nextConfig).toContain('frame-src ${frameSources.join');
    expect(nextConfig).not.toContain("hostname: '**'");
  });

  it('publishes canonical and social metadata for Sakura Makeup', () => {
    expect(rootLayout).toContain("title: 'Sakura Makeup");
    expect(rootLayout).toContain('metadataBase: siteUrl');
    expect(rootLayout).toContain("canonical: '/'");
    expect(rootLayout).toContain('openGraph:');
    expect(rootLayout).toContain('twitter:');
    expect(rootLayout).toContain('application/ld+json');
    expect(rootLayout).toContain('<html lang="es-GT"');
  });

  it('indexes only public routes and exposes a public sitemap', () => {
    expect(robots).not.toContain("disallow: ['/admin', '/seller', '/login', '/cart', '/order-confirmation']");
    expect(robots).toContain("sitemap: `${siteUrl.origin}/sitemap.xml`");
    expect(sitemap).toContain("'/aviso-legal'");
    expect(sitemap).toContain("'/privacidad'");
    expect(sitemap).toContain("'/cookies'");
    expect(adminMetadata).toContain('index: false');
    expect(sellerMetadata).toContain('index: false');
  });

  it('links the legal and privacy information from the footer', () => {
    expect(footer).toContain('href="/aviso-legal"');
    expect(footer).toContain('href="/privacidad"');
    expect(footer).toContain('href="/cookies"');
    expect(footer).toContain('Sakura Makeup');
  });

  it('keeps Supabase authentication out of the public catalog shell', () => {
    expect(rootLayout).not.toContain("import { AuthProvider }");
    expect(appShell).toContain("dynamic(() => import('./private-shell')");
    expect(appShell).toContain("const needsAuthentication = ['/admin', '/seller', '/login', '/portal']");
  });

  it('provides route-specific social previews for legal pages', () => {
    for (const source of [legalNotice, privacy, cookies]) {
      expect(source).toContain('openGraph:');
      expect(source).toContain('twitter:');
    }
  });
});
