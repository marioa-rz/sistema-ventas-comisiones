import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-rose-100 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 space-y-4 sm:space-y-0">
        <div>
          <p className="font-medium text-gray-700">Sakura Nails & Beauty</p>
          <p>Sistema de gestión de catálogo, pedidos y comisiones.</p>
        </div>
        <div className="flex space-x-6">
          <Link href="/" className="hover:text-sakura-600 transition-colors">
            Catálogo
          </Link>
          <Link href="/login" className="hover:text-sakura-600 transition-colors">
            Portal Vendedores
          </Link>
          <Link href="/login" className="hover:text-sakura-600 transition-colors">
            Administración
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Sakura Nails. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
