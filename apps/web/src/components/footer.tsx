import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0D0A0C] border-t border-[rgba(255,45,155,0.15)] py-8 mt-16 text-xs text-[#96878F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 text-center sm:grid-cols-3 sm:text-left">
        <div>
          <p className="font-bold text-[#F8F0F5]">
            Sakura <span className="text-sakura">Makeup</span>
          </p>
          <p className="text-[11px] text-[#A09098]">Sakura Studio · Villa Hermosa, San Miguel Petapa, Guatemala.</p>
          <a href="tel:+50242727527" className="mt-1 inline-block hover:text-sakura">4272-7527</a>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/aviso-legal" className="hover:text-sakura transition-colors">Aviso legal</Link>
          <Link href="/privacidad" className="hover:text-sakura transition-colors">Privacidad</Link>
          <Link href="/cookies" className="hover:text-sakura transition-colors">Cookies</Link>
        </div>
        <div className="sm:text-right">
          <a href="https://www.instagram.com/sakuraaa_makeup/" target="_blank" rel="noreferrer" className="hover:text-sakura">Instagram Sakura Makeup</a>
          <p className="mt-1 text-[11px]">© {new Date().getFullYear()} Sakura Makeup.</p>
        </div>
      </div>
    </footer>
  );
}
