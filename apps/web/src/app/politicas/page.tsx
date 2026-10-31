import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Truck, Clock, RefreshCw, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Políticas de servicio y envíos | Sakura Makeup',
  description: 'Condiciones de despacho, propiedad de paquetes pagados y coordinación de entregas en Guatemala.',
  alternates: { canonical: '/politicas' },
  openGraph: {
    title: 'Políticas de servicio y envíos | Sakura Makeup',
    description: 'Condiciones de despacho, propiedad de paquetes pagados y coordinación de entregas en Guatemala.',
    url: '/politicas',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Políticas de servicio y envíos | Sakura Makeup',
    description: 'Condiciones de despacho, propiedad de paquetes pagados y coordinación de entregas en Guatemala.',
    images: ['/opengraph-image'],
  },
};

export default function PoliticasPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A09098] hover:text-sakura transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Catálogo</span>
        </Link>
        <div className="mt-3 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sakura">Sakura Makeup</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Políticas de Servicio y Entregas</h1>
          <p className="text-xs sm:text-sm text-[#A09098]">
            Términos transparentes sobre despachos, propiedad de paquetes pagados y condiciones de mensajería.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[#C2B6BC] leading-relaxed">
        {/* Sección 1: Tiempos de Despacho */}
        <section className="bg-[#0D0A0C] border border-[rgba(255,45,155,0.2)] rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <Truck className="w-5 h-5 text-sakura shrink-0" />
            <h2>1. Tiempos de Despacho y Envío</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#AFA1A8]">
            <strong className="text-white">Los paquetes se envían el día siguiente a la compra</strong>, una vez que la clienta comparte su código único (<span className="font-mono text-sakura">VNT-XXXXXX</span>) a su vendedora y se valida la disponibilidad de los productos y la modalidad de pago.
          </p>
          <div className="rounded-xl bg-[#131014] border border-white/5 p-3 text-xs text-[#A09098]">
            Las entregas son operadas por empresas de mensajería aliadas hacia todo el territorio de Guatemala.
          </div>
        </section>

        {/* Sección 2: Propiedad de Paquetes Pagados */}
        <section className="bg-[#0D0A0C] border border-[rgba(255,45,155,0.2)] rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2>2. Propiedad de Paquetes Ya Pagados</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#AFA1A8]">
            Cualquier paquete cuyo pago ya haya sido verificado (transferencia bancaria o liquidado con anterioridad) que por motivos personales, ausencia en la dirección o causas de fuerza mayor no haya podido ser recibido por la clienta, <strong className="text-white">sigue siendo propiedad absoluta de la clienta</strong>.
          </p>
          <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            En Sakura Makeup resguardamos tus productos de forma segura. Tu compra no se anula ni se pierde tu dinero.
          </div>
        </section>

        {/* Sección 3: Cobros de Mensajería y Reintentos */}
        <section className="bg-[#0D0A0C] border border-[rgba(255,45,155,0.2)] rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
            <h2>3. Reintentos de Mensajería y Cobros Adicionales</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#AFA1A8]">
            Las empresas de mensajería realizan intentos de entrega según sus protocolos de ruta. <strong className="text-white">Únicamente si la mensajería vuelve a cobrar</strong> una tarifa por segundo intento de entrega, reprogramación de ruta, cambio de dirección de última hora o retorno de guía por ausencia de la destinataria, <strong className="text-amber-300">dicho cobro adicional va por cuenta de la clienta</strong>.
          </p>
          <div className="rounded-xl bg-amber-950/30 border border-amber-500/30 p-3 text-xs text-amber-200">
            Recomendamos asegurar que haya una persona autorizada en la dirección de entrega o indicar una referencia exacta al momento de coordinar con tu vendedora.
          </div>
        </section>

        {/* Sección 4: Asignación y Reclamo de Pedidos */}
        <section className="bg-[#0D0A0C] border border-[rgba(255,45,155,0.2)] rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <AlertCircle className="w-5 h-5 text-sakura shrink-0" />
            <h2>4. Coordinación con tu Vendedora</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#AFA1A8]">
            Cada pedido generado en el catálogo emite un código único de formato <span className="font-mono text-sakura font-bold">VNT-XXXXXX</span>. Es indispensable que la clienta proporcione este código a su vendedora para que ella pueda auto-asignarse el pedido en el portal, preparar el paquete y gestionar el despacho correspondiente.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-white/10 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sakura-700 hover:bg-sakura-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,45,155,0.3)] active:scale-95"
        >
          <span>Ir al Catálogo de Productos</span>
        </Link>
      </div>
    </div>
  );
}
