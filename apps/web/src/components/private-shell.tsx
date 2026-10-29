'use client';

import { AuthProvider } from '../lib/auth-context';
import { CartProvider } from '../lib/cart-context';
import { Footer } from './footer';
import { Navbar } from './navbar';

export default function PrivateShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <Footer />
      </CartProvider>
    </AuthProvider>
  );
}
