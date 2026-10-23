'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Sparkles, User, LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const { totalItemsCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sakura-500 to-rose-300 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-sakura-700 to-rose-500 bg-clip-text text-transparent">
              Sakura Nails
            </span>
            <span className="block text-[10px] tracking-wider uppercase text-rose-400 font-semibold -mt-1">
              Catálogo & Ventas
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'bg-rose-50 text-sakura-700 font-semibold'
                : 'text-gray-600 hover:text-sakura-600 hover:bg-rose-50/50'
            }`}
          >
            Catálogo
          </Link>

          {user && user.role === 'SELLER' && (
            <Link
              href="/seller"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/seller'
                  ? 'bg-rose-50 text-sakura-700 font-semibold'
                  : 'text-gray-600 hover:text-sakura-600 hover:bg-rose-50/50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Mis Pedidos</span>
            </Link>
          )}

          {user && user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/admin'
                  ? 'bg-rose-50 text-sakura-700 font-semibold'
                  : 'text-gray-600 hover:text-sakura-600 hover:bg-rose-50/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel Admin</span>
            </Link>
          )}

          <Link
            href="/cart"
            className="relative p-2 text-gray-700 hover:text-sakura-600 transition-colors"
            aria-label="Carrito de compras"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItemsCount > 0 && (
              <span className="absolute top-1 right-1 bg-sakura-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-scale-in">
                {totalItemsCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
              <span className="hidden sm:inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                {user.displayName} ({user.role === 'ADMIN' ? 'Admin' : 'Vendedora'})
              </span>
              <button
                onClick={() => void logout()}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-sakura-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-rose-200 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
