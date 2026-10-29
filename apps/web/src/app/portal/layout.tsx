import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Acceso | Sakura Makeup',
  description: 'Portal de acceso exclusivo para vendedoras y administración.',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
