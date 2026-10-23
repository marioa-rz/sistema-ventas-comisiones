'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Share2, ArrowRight, Sparkles, MessageCircle } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const publicCode = searchParams.get('code') || 'VNT-PENDIENTE';
  const total = searchParams.get('total') || '0.00';
  const paymentMethod = searchParams.get('method') || 'CASH';
  const customerName = searchParams.get('name') || 'Cliente';

  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(publicCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const shareText = `¡Hola! Acabo de hacer un pedido en Sakura Nails. Mi código de pedido es: *${publicCode}* por un total de Q${total}.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-6">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900">¡Pedido Generado con Éxito!</h1>
        <p className="text-sm text-gray-600">
          Gracias por tu compra, <span className="font-semibold text-gray-800">{customerName}</span>. Comparte este código único con tu vendedora para que lo reclame y prepare tu entrega.
        </p>
      </div>

      {/* Tarjeta del Código Público */}
      <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50 border-2 border-dashed border-sakura-300 rounded-2xl p-6 shadow-sm space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-sakura-600">
          Código Único de Pedido
        </span>
        <div className="text-4xl font-mono font-black tracking-widest text-gray-900 select-all">
          {publicCode}
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Monto Total: <span className="text-gray-900 font-bold text-sm">Q{parseFloat(total).toFixed(2)}</span> ({paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo'})
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-500" />
                <span>Copiar Código</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Pasos siguientes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-left text-xs space-y-3 text-gray-600 shadow-sm">
        <h3 className="font-bold text-gray-800 text-sm">¿Qué sigue ahora?</h3>
        <ol className="list-decimal pl-4 space-y-1.5">
          <li>Copia tu código o compártelo a tu vendedora por mensaje.</li>
          <li>Tu vendedora ingresará el código en su sistema para asignarse tu pedido.</li>
          <li>
            {paymentMethod === 'CASH'
              ? 'Pagarás en efectivo al momento de recibir tus productos.'
              : 'La administración revisará tu comprobante y confirmará el pago.'}
          </li>
        </ol>
      </div>

      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-sm font-semibold text-sakura-600 hover:text-sakura-700 transition-colors"
        >
          <span>Volver a la tienda principal</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-500 text-sm">Cargando confirmación...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
