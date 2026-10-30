import React from 'react';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.59c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.42-.42-.57-.43l-.49-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[rgba(255,45,155,0.18)] bg-[#0D0A0C] text-sm text-[#A09098]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-10 text-left md:grid-cols-12 md:gap-8 lg:py-12">
          <div className="md:col-span-5 lg:col-span-6">
            <Link
              href="/"
              className="inline-block rounded-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D0A0C]"
              aria-label="Ir al inicio de Sakura Makeup"
            >
              <div className="relative h-11 w-36 sm:h-12 sm:w-40">
                <Image
                  src="/sakura-brand.webp"
                  alt="Sakura Makeup"
                  fill
                  sizes="(max-width: 640px) 144px, 160px"
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="mt-4 max-w-sm leading-6 text-[#AFA1A8]">
              Sakura Studio · Catálogo de maquillaje y productos de belleza.
            </p>
          </div>

          <section aria-label="Información de contacto" className="md:col-span-4 lg:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F8F0F5]">Contacto</h2>
            <address className="mt-4 space-y-3 not-italic">
              <div className="flex items-start gap-3 leading-5">
                <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-sakura" aria-hidden="true" />
                <span>Villa Hermosa, San Miguel Petapa, Guatemala</span>
              </div>
              <a
                href="https://wa.me/50242727527"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contactar por WhatsApp al 4272-7527"
                className="inline-flex min-h-8 items-center gap-3 rounded-sm text-[#C2B6BC] transition-colors hover:text-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D0A0C]"
              >
                <WhatsAppIcon className="h-[18px] w-[18px] shrink-0 text-[#25D366]" />
                <span>4272-7527</span>
              </a>
            </address>
          </section>

          <section className="md:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F8F0F5]">Síguenos</h2>
            <a
              href="https://www.instagram.com/sakuraaa_makeup/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Sakura Makeup"
              className="mt-3 inline-flex min-h-8 items-center gap-3 rounded-sm text-[#C2B6BC] transition-colors hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D0A0C]"
            >
              <InstagramIcon className="h-[18px] w-[18px] shrink-0 text-sakura" />
              <span>@sakuraaa_makeup</span>
            </a>
          </section>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/[0.08] py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sakura Makeup. Todos los derechos reservados.</p>
          <nav aria-label="Enlaces legales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link href="/politicas" className="rounded-sm transition-colors hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura">Políticas y Envíos</Link>
              </li>
              <li>
                <Link href="/aviso-legal" className="rounded-sm transition-colors hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura">Aviso legal</Link>
              </li>
              <li>
                <Link href="/privacidad" className="rounded-sm transition-colors hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura">Privacidad</Link>
              </li>
              <li>
                <Link href="/cookies" className="rounded-sm transition-colors hover:text-sakura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura">Cookies</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
