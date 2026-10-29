import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '../components/app-shell';
import { siteUrl } from '../lib/site-url';

const businessStructuredData = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'Sakura Makeup',
  legalName: 'Sakura Studio',
  url: siteUrl.origin,
  telephone: '+502 4272-7527',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Villa Hermosa, San Miguel Petapa',
    addressCountry: 'GT',
  },
  sameAs: [
    'https://www.instagram.com/sakuraaa_makeup/',
    'https://www.instagram.com/sakuraaa_studio/',
  ],
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'Sakura Makeup | Catálogo y pedidos',
  description: 'Catálogo de maquillaje y productos de belleza de Sakura Makeup en Guatemala.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_GT',
    url: '/',
    siteName: 'Sakura Makeup',
    title: 'Sakura Makeup | Catálogo y pedidos',
    description: 'Descubre maquillaje y productos de belleza y realiza tu pedido en línea.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Sakura Makeup' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sakura Makeup | Catálogo y pedidos',
    description: 'Descubre maquillaje y productos de belleza y realiza tu pedido en línea.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-GT" className="dark">
      <body className="flex flex-col min-h-screen antialiased bg-[#080608] text-[#F8F0F5]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessStructuredData).replace(/</g, '\\u003c') }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
