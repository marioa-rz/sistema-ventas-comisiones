import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookies y almacenamiento | Sakura Makeup',
  description: 'Uso actual de cookies y almacenamiento local en Sakura Makeup.',
  alternates: { canonical: '/cookies' },
  openGraph: {
    title: 'Cookies y almacenamiento | Sakura Makeup',
    description: 'Uso actual de cookies y almacenamiento local en Sakura Makeup.',
    url: '/cookies',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookies y almacenamiento | Sakura Makeup',
    description: 'Uso actual de cookies y almacenamiento local en Sakura Makeup.',
    images: ['/opengraph-image'],
  },
};

export default function CookiesPage() {
  return (
    <article className="legal-copy mx-auto max-w-3xl text-[#C2B6BC]">
      <h1 className="text-white">Cookies y almacenamiento local</h1>
      <p>El catálogo no instala analítica, publicidad ni cookies no esenciales. Por ese motivo no se muestra un banner que pida aceptar tecnologías que actualmente no se usan.</p>
      <h2 className="text-white">Almacenamiento necesario</h2>
      <p>El navegador conserva localmente el carrito y una clave de idempotencia para evitar pedidos duplicados. El portal interno de vendedoras y administración usa la sesión técnica de Supabase Auth. Estos mecanismos son necesarios para las funciones solicitadas por la persona usuaria.</p>
      <h2 className="text-white">Cambios futuros</h2>
      <p>Antes de añadir analítica, publicidad u otra tecnología no esencial, Sakura Makeup deberá identificar proveedor, finalidad, duración y base aplicable; bloquearla por defecto y solicitar consentimiento previo que pueda retirarse con la misma facilidad.</p>
      <p className="text-sm">Última actualización: 28 de octubre de 2026.</p>
    </article>
  );
}
