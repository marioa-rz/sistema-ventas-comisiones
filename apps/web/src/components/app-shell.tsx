'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { CartProvider } from '../lib/cart-context';
import { Footer } from './footer';
import { PublicNavbar } from './public-navbar';

const PrivateShell = dynamic(() => import('./private-shell'), {
  loading: () => <div className="min-h-screen animate-pulse bg-[#080608]" aria-label="Cargando acceso interno" />,
});

const needsAuthentication = ['/admin', '/seller', '/login', '/portal'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthenticatedArea = needsAuthentication.some((route) => pathname.startsWith(route));

  if (isAuthenticatedArea) return <PrivateShell>{children}</PrivateShell>;

  return (
    <CartProvider>
      <PublicNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <Footer />
    </CartProvider>
  );
}
