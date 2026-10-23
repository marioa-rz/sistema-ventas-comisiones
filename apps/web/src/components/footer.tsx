import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0D0A0C] border-t border-[rgba(255,45,155,0.15)] py-8 mt-16 text-xs text-[#96878F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <p className="font-bold text-[#F8F0F5]">
            Sakura <span className="text-sakura">Beauty</span>
          </p>
          <p className="text-[11px] text-[#A09098]">Catálogo de productos, pedidos y comisiones.</p>
        </div>
        <div className="flex space-x-6">
          <Link href="/" className="hover:text-sakura transition-colors">
            Catálogo
          </Link>
          <Link href="/login" className="hover:text-sakura transition-colors">
            Portal Vendedores
          </Link>
          <Link href="/login" className="hover:text-sakura transition-colors">
            Administración
          </Link>
        </div>
        <p className="text-[11px]">© {new Date().getFullYear()} Sakura Beauty. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
