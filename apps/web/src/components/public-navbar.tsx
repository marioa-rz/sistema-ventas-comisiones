'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../lib/cart-context';
import { useCatalogSearch } from '../lib/catalog-search-context';

const SEARCH_CLOSE_DURATION_MS = 220;

export function PublicNavbar() {
  const { totalItemsCount } = useCart();
  const { searchQuery, setSearchQuery } = useCatalogSearch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isOpen = isExpanded || searchQuery.length > 0;
  const isSearchVisible = isOpen || isClosing;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    const startsSearching = !searchQuery.trim() && value.trim().length > 0;
    setSearchQuery(value);

    if (!startsSearching) return;

    if (pathname !== '/') {
      router.push('/#productos');
      return;
    }

    document.getElementById('productos')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleOpen = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setIsExpanded(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setIsClosing(true);
    setIsExpanded(false);
    setSearchQuery('');

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    const closeDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : SEARCH_CLOSE_DURATION_MS;
    closeTimerRef.current = window.setTimeout(() => setIsClosing(false), closeDuration);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  const handleBlur = () => {
    if (!searchQuery && !isClosing) {
      handleClose();
    }
  };

  return (
    <header className="motion-feedback sticky top-0 z-50 border-b border-[rgba(255,45,155,0.2)] bg-[#0D0A0C]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <div className="bg-sakura-800 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
        <span>Envíos a toda Guatemala</span>
        <span className="mx-2.5 hidden text-white/60 sm:inline" aria-hidden="true">•</span>
        <span className="hidden sm:inline">Compra sin registrarte</span>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Lado izquierdo: Logotipo oficial de marca con redirección al inicio */}
        <Link
          href="/"
          onClick={() => {
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`group shrink-0 items-center rounded-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura ${isSearchVisible ? 'hidden sm:flex' : 'flex'}`}
          aria-label="Ir al inicio del catálogo de Sakura Makeup"
        >
          <div className="relative h-12 w-40 transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-48">
            <Image
              src="/sakura-brand.webp"
              alt="Sakura Makeup"
              fill
              sizes="(max-width: 640px) 160px, 192px"
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Lado derecho: Solo Buscador y Carrito */}
        <div className={`flex min-w-0 items-center justify-end gap-2 sm:flex-1 sm:gap-3 ${isSearchVisible ? 'flex-1' : ''}`}>
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className={`relative flex min-w-0 items-center justify-end ${isSearchVisible ? 'flex-1' : ''}`}
          >
            {!isSearchVisible ? (
              <button
                type="button"
                onClick={handleOpen}
                aria-label="Buscar productos"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#C2B6BC] transition hover:bg-white/5 hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura/40"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <>
                <div className={`${isClosing ? 'motion-search-hide' : 'motion-search-reveal'} relative min-w-0 flex-1 transition-[width,opacity,transform] duration-300 ease-out sm:w-64 sm:flex-none md:w-80`}>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    aria-label="Buscar productos"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    disabled={isClosing}
                    onBlur={handleBlur}
                    onKeyDown={handleSearchKeyDown}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    className="h-11 w-full min-w-0 appearance-none rounded-xl border border-sakura bg-white/[0.08] pl-4 pr-11 text-sm text-white outline-none shadow-[0_0_18px_rgba(255,45,155,0.18)] transition placeholder:text-white/45 focus:border-sakura-glow focus:ring-2 focus:ring-sakura/30 sm:h-10 sm:rounded-full"
                  />
                  <Search className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-sakura" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar búsqueda"
                  className={`${isClosing ? 'motion-search-hide' : 'motion-search-reveal'} ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#C2B6BC] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura/40 sm:ml-2`}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}
          </form>

          <Link
            href="/cart"
            aria-label={`Carrito con ${totalItemsCount} productos`}
            className={`relative h-10 w-10 items-center justify-center rounded-lg text-[#C2B6BC] transition hover:bg-white/5 hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura/40 ${isSearchVisible ? 'hidden sm:inline-flex' : 'inline-flex'}`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {totalItemsCount > 0 && (
              <span key={totalItemsCount} className="motion-value-change absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-sakura-700 px-1 text-[10px] font-black text-white">
                {totalItemsCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
