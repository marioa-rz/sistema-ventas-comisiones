'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, ArrowRight, Sparkles, MessageCircle } from 'lucide-react';

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

  const shareText = `¡Hola! Acabo de hacer un pedido en Sakura Beauty. Mi código de pedido es: *${publicCode}* por un total de Q${total}.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-6">
      <div className="w-16 h-16 bg-[rgba(255,45,155,0.15)] text-sakura border border-[rgba(255,45,155,0.4)] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,45,155,0.3)]">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white">¡Pedido Generado con Éxito!</h1>
        <p className="text-sm text-[#A09098]">
          Gracias por tu compra en <span className="font-bold text-sakura">Sakura Beauty</span>,{' '}
          <span className="font-semibold text-white">{customerName}</span>. Comparte este código único con tu vendedora para que lo reclame y prepare tu entrega.
        </p>
      </div>

      {/* Tarjeta del Código Público en estilo Dark & Magenta Glow */}
      <div className="bg-[#0D0A0C] border-2 border-dashed border-sakura rounded-2xl p-6 shadow-[0_0_30px_rgba(255,45,155,0.2)] space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-sakura">
          Código Único de Pedido
        </span>
        <div className="text-4xl font-mono font-black tracking-widest text-white select-all drop-shadow-[0_0_10px_rgba(255,45,155,0.5)]">
          {publicCode}
        </div>
        <div className="text-xs text-[#96878F] font-medium">
          Monto Total:{' '}
          <span className="text-white font-bold text-sm">Q{parseFloat(total).toFixed(2)}</span>{' '}
          ({paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo'})
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#131014] hover:bg-[#1A151A] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-400" />
                <span>Copiar Código</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Pasos siguientes */}
      <div className="bg-[#0D0A0C] rounded-xl border border-[rgba(255,255,255,0.08)] p-5 text-left text-xs space-y-3 text-[#C2B6BC] shadow-sm">
        <h3 className="font-bold text-white text-sm">¿Qué sigue ahora?</h3>
        <ol className="list-decimal pl-4 space-y-1.5 text-[#A09098]">
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
          className="inline-flex items-center space-x-1.5 text-sm font-semibold text-sakura hover:text-sakura-glow transition-colors"
        >
          <span>Volver al catálogo principal</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[#A09098] text-sm">Cargando confirmación...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
