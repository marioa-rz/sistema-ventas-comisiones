import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacidad | Sakura Makeup',
  description: 'Información sobre el tratamiento de datos al realizar pedidos en Sakura Makeup.',
  alternates: { canonical: '/privacidad' },
  openGraph: {
    title: 'Privacidad | Sakura Makeup',
    description: 'Información sobre el tratamiento de datos al realizar pedidos en Sakura Makeup.',
    url: '/privacidad',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacidad | Sakura Makeup',
    description: 'Información sobre el tratamiento de datos al realizar pedidos en Sakura Makeup.',
    images: ['/opengraph-image'],
  },
};

export default function PrivacyPage() {
  return (
    <article className="legal-copy mx-auto max-w-3xl text-[#C2B6BC]">
      <h1 className="text-white">Privacidad</h1>
      <p>Sakura Studio, bajo el nombre comercial Sakura Makeup, recibe los datos que proporcionas para registrar y gestionar tu pedido.</p>
      <h2 className="text-white">Datos utilizados</h2>
      <ul><li>Nombre y teléfono de contacto.</li><li>Productos y cantidades solicitadas.</li><li>Método de pago y, cuando corresponde, comprobante de transferencia.</li><li>Datos técnicos mínimos necesarios para seguridad, rate limiting e idempotencia.</li></ul>
      <h2 className="text-white">Finalidad y acceso</h2>
      <p>Los datos se usan para procesar el pedido, coordinar la venta, verificar pagos y mantener registros comerciales. La aplicación está diseñada para guardar los comprobantes en un bucket privado y entregar enlaces temporales únicamente al personal autorizado; esa privacidad debe comprobarse en la configuración de Supabase antes de publicar.</p>
      <h2 className="text-white">Conservación y solicitudes</h2>
      <p>Los registros financieros deben conservar su historial y se desactivan o corrigen de manera controlada. Para consultar o solicitar una corrección de tus datos, llama al <a href="tel:+50242727527">4272-7527</a> o escribe por <a href="https://www.instagram.com/sakuraaa_makeup/">Instagram</a>. El negocio deberá definir un correo dedicado antes del lanzamiento si desea ofrecer ese canal.</p>
      <p className="text-sm">Última actualización: 28 de octubre de 2026. Este texto describe el funcionamiento implementado y no inventa identidad fiscal ni plazos legales no proporcionados.</p>
    </article>
  );
}
