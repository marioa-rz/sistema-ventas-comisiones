import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso legal | Sakura Makeup',
  description: 'Identificación y condiciones de uso del catálogo de Sakura Makeup.',
  alternates: { canonical: '/aviso-legal' },
  openGraph: {
    title: 'Aviso legal | Sakura Makeup',
    description: 'Identificación y condiciones de uso del catálogo de Sakura Makeup.',
    url: '/aviso-legal',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aviso legal | Sakura Makeup',
    description: 'Identificación y condiciones de uso del catálogo de Sakura Makeup.',
    images: ['/opengraph-image'],
  },
};

export default function LegalNoticePage() {
  return (
    <article className="legal-copy mx-auto max-w-3xl text-[#C2B6BC]">
      <h1 className="text-white">Aviso legal</h1>
      <p>Este catálogo es operado por <strong>Sakura Studio</strong>, nombre comercial <strong>Sakura Makeup</strong>, con ubicación en Villa Hermosa, San Miguel Petapa, Guatemala.</p>
      <h2 className="text-white">Contacto</h2>
      <p>Teléfono: <a href="tel:+50242727527">4272-7527</a>. También puedes contactar al negocio mediante <a href="https://www.instagram.com/sakuraaa_makeup/">Instagram de Sakura Makeup</a> o <a href="https://www.instagram.com/sakuraaa_studio/">Instagram de Sakura Studio</a>.</p>
      <h2 className="text-white">Uso del catálogo</h2>
      <p>La información de productos y disponibilidad puede actualizarse. El precio y total aplicables se calculan y confirman en el sistema al generar el pedido. El código de pedido identifica la solicitud, pero no sustituye una autenticación ni acredita por sí solo el pago.</p>
      <p className="text-sm">Última actualización: 28 de octubre de 2026.</p>
    </article>
  );
}
