'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, User, LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItemsCount } = useCart();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0D0A0C]/90 backdrop-blur-md border-b border-[rgba(255,45,155,0.2)] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/sakura-logo.png"
              alt="Sakura Beauty"
              fill
              className="object-contain filter drop-shadow-[0_0_12px_rgba(255,45,155,0.35)] group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-sakura transition-colors">
              Sakura <span className="text-sakura font-extrabold">Beauty</span>
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-[#A09098] font-semibold -mt-1">
              Catálogo & Ventas
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === '/'
                ? 'bg-[rgba(255,45,155,0.15)] text-sakura border border-[rgba(255,45,155,0.3)] shadow-[0_0_15px_rgba(255,45,155,0.2)] font-semibold'
                : 'text-[#C2B6BC] hover:text-white hover:bg-white/5'
            }`}
          >
            Catálogo
          </Link>

          {user && user.role === 'SELLER' && (
            <Link
              href="/seller"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === '/seller'
                  ? 'bg-[rgba(255,45,155,0.15)] text-sakura border border-[rgba(255,45,155,0.3)] font-semibold'
                  : 'text-[#C2B6BC] hover:text-white hover:bg-white/5'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-sakura" />
              <span>Mis Pedidos</span>
            </Link>
          )}

          {user && user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin'
                  ? 'bg-[rgba(255,45,155,0.15)] text-sakura border border-[rgba(255,45,155,0.3)] font-semibold'
                  : 'text-[#C2B6BC] hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-sakura" />
              <span>Panel Admin</span>
            </Link>
          )}

          <Link
            href="/cart"
            className="relative p-2 text-[#C2B6BC] hover:text-sakura transition-colors rounded-lg hover:bg-white/5"
            aria-label="Carrito de compras"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span className="absolute top-1 right-1 bg-sakura text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,45,155,0.6)]">
                {totalItemsCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
              <span className="hidden sm:inline-block text-xs font-medium text-[#C2B6BC] bg-[#1A151A] px-2.5 py-1 rounded-full border border-white/5">
                {user.displayName} ({user.role === 'ADMIN' ? 'Admin' : 'Vendedora'})
              </span>
              <button
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                aria-label="Cerrar sesión"
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 disabled:cursor-wait disabled:opacity-50"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 text-xs font-semibold text-[#F8F0F5] hover:text-sakura px-3 py-1.5 rounded-lg border border-[rgba(255,45,155,0.3)] bg-[rgba(255,45,155,0.08)] hover:bg-[rgba(255,45,155,0.18)] transition-all shadow-[0_0_12px_rgba(255,45,155,0.15)]"
            >
              <User className="w-3.5 h-3.5 text-sakura" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
