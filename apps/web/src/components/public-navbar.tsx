'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/cart-context';

export function PublicNavbar() {
  const { totalItemsCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,45,155,0.2)] bg-[#0D0A0C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <div className="bg-sakura-800 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
        <span>Envíos a toda Guatemala</span><span className="ml-6 hidden sm:inline">Compra sin registrarte</span>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Ir al catálogo de Sakura Makeup">
          <span className="relative h-10 w-10"><Image src="/sakura-logo.png" alt="" fill sizes="40px" className="object-contain" priority /></span>
          <span className="text-lg font-bold text-white sm:text-xl">Sakura <span className="text-sakura">Makeup</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#C2B6BC] hover:text-white sm:inline-flex">Catálogo</Link>
          <Link href="/cart" aria-label={`Carrito con ${totalItemsCount} productos`} className="relative rounded-lg p-2 text-[#C2B6BC] hover:bg-white/5 hover:text-sakura">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {totalItemsCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-sakura-700 px-1 text-[10px] font-black text-white">{totalItemsCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
