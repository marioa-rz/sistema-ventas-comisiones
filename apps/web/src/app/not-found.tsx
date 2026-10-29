import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada | Sakura Makeup',
  robots: { index: false, follow: false },
  alternates: {},
};

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-sakura">Error 404</p>
      <h1 className="mt-4 text-4xl font-black text-white">Esta página no floreció</h1>
      <p className="mt-4 text-[#C2B6BC]">La dirección no existe o cambió. Puedes volver al catálogo público.</p>
      <Link href="/" className="mt-8 inline-flex rounded-xl bg-sakura-700 px-6 py-3 font-bold text-white hover:bg-sakura-600">Ver catálogo</Link>
    </section>
  );
}
