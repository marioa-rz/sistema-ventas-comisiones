'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Copy,
  ArrowRight,
  MessageCircle,
  Truck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code')?.trim().toUpperCase() ?? '';
  const publicCode = /^VNT-[A-Z0-9]{6}$/.test(code) ? code : null;

  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!publicCode) return;
    try {
      await navigator.clipboard.writeText(publicCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!publicCode) {
    return (
      <div className="motion-confirmation max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-2xl font-black text-white">No encontramos un código de pedido válido</h1>
        <p className="text-sm text-[#A09098]">Regresa al catálogo y completa el pedido nuevamente.</p>
        <Link href="/" className="inline-flex text-sm font-semibold text-sakura hover:text-sakura-glow">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const shareText = `¡Hola! Acabo de hacer un pedido en Sakura Makeup. Mi código de pedido es: *${publicCode}*.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="motion-confirmation max-w-xl mx-auto py-8 px-4 text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white">¡Pedido Generado con Éxito!</h1>
        <p className="text-sm text-[#A09098]">
          Gracias por tu compra en <span className="font-bold text-sakura">Sakura Makeup</span>. Comparte este
          código único con tu vendedora para que lo reclame y prepare tu entrega.
        </p>
      </div>

      {/* Tarjeta del Código Público en estilo Dark & Magenta Glow */}
      <div className="motion-confirmation-card bg-[#0D0A0C] border-2 border-dashed border-sakura rounded-2xl p-6 shadow-[0_0_30px_rgba(255,45,155,0.2)] space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-sakura">
          Código Único de Pedido
        </span>
        <div className="text-4xl font-mono font-black tracking-widest text-white select-all drop-shadow-[0_0_10px_rgba(255,45,155,0.5)]">
          {publicCode}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#131014] hover:bg-[#1A151A] text-white text-xs font-semibold shadow-sm transition-[color,background-color,border-color,transform] duration-200 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="motion-value-change text-emerald-400">¡Copiado!</span>
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
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-[background-color,box-shadow,transform] duration-200 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </a>
        </div>

        {/* Llamado de Atención Inmediato */}
        <div className="pt-3 border-t border-sakura/25 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sakura/20 text-sakura border border-sakura/40 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>¡Paso obligatorio para procesar tu entrega!</span>
          </div>
          <p className="text-xs text-[#F8F0F5] font-medium leading-relaxed max-w-md mx-auto">
            Por favor, <strong className="text-sakura">envía este código a tu vendedora</strong> por mensaje. Tu pedido no podrá ser preparado hasta que ella lo ingrese en su sistema.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#131014] border border-white/10 text-[#C2B6BC] text-xs">
            <Truck className="w-4 h-4 text-sakura shrink-0" />
            <span>Los paquetes se envían el día siguiente a la compra</span>
          </div>
        </div>
      </div>

      {/* Pasos siguientes más llamativos y visibles */}
      <div className="bg-gradient-to-b from-[#180C14] to-[#0D0A0C] rounded-2xl border border-sakura/40 p-5 sm:p-6 text-left space-y-4 shadow-[0_0_25px_rgba(255,45,155,0.15)]">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
          <CheckCircle2 className="w-5 h-5 text-sakura shrink-0" />
          <div>
            <h2 className="font-black text-white text-base">¿Qué sigue ahora?</h2>
            <p className="text-[11px] text-[#A09098]">Sigue estos sencillos pasos para asegurar la entrega de tu pedido:</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-[#131014] p-3 rounded-xl border border-white/5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sakura font-bold text-xs text-white shadow-[0_0_10px_rgba(255,45,155,0.4)]">
              1
            </span>
            <div className="text-xs">
              <strong className="text-white block font-bold text-[13px]">
                Copia tu código o compártelo a tu vendedora por mensaje.
              </strong>
              <span className="text-[#A09098] text-[11px]">
                Usa el botón de WhatsApp arriba para enviárselo directamente.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#131014] p-3 rounded-xl border border-white/5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sakura font-bold text-xs text-white shadow-[0_0_10px_rgba(255,45,155,0.4)]">
              2
            </span>
            <div className="text-xs">
              <strong className="text-white block font-bold text-[13px]">
                Tu vendedora ingresará el código en su sistema para asignarse tu pedido.
              </strong>
              <span className="text-[#A09098] text-[11px]">
                Así sabrá exactamente qué productos prepararte y apartará tu stock.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#131014] p-3 rounded-xl border border-white/5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sakura font-bold text-xs text-white shadow-[0_0_10px_rgba(255,45,155,0.4)]">
              3
            </span>
            <div className="text-xs">
              <strong className="text-white block font-bold text-[13px]">
                La administración confirmará la venta cuando valide el pago correspondiente.
              </strong>
              <span className="text-[#A09098] text-[11px]">
                Al validar el pago, tu paquete quedará listo para despacho con la mensajería.
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#080608] border border-sakura/30 p-3 flex items-center gap-2.5 text-xs text-[#F8F0F5]">
          <Truck className="w-5 h-5 text-sakura shrink-0" />
          <p className="text-[11px] leading-tight">
            <span className="font-bold text-white block">Tiempo de despacho:</span>
            Los paquetes se envían el día siguiente a la compra.
          </p>
        </div>
      </div>

      {/* Políticas de Entrega y Servicio */}
      <div className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,255,255,0.1)] p-5 text-left space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-sakura shrink-0" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-sakura">
            Políticas de Envío y Entrega
          </h3>
        </div>

        <div className="space-y-2.5 text-xs text-[#C2B6BC] leading-relaxed">
          <div className="p-3 bg-[#131014] rounded-xl border border-white/5 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              Propiedad del paquete ya pagado
            </p>
            <p className="text-[11px] text-[#A09098]">
              Si tu paquete ya fue pagado y por algún motivo no pudiste recibirlo en la fecha o dirección indicada, <strong className="text-white">el producto sigue siendo de la clienta</strong>. No pierdes tu compra.
            </p>
          </div>

          <div className="p-3 bg-[#131014] rounded-xl border border-white/5 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              Reintentos de mensajería y cobros adicionales
            </p>
            <p className="text-[11px] text-[#A09098]">
              Únicamente si la mensajería vuelve a cobrar por un segundo intento de entrega, reprogramación o retorno por ausencia en la dirección, <strong className="text-amber-300">dicho cobro va para la clienta</strong>.
            </p>
          </div>

          <div className="p-3 bg-[#131014] rounded-xl border border-white/5 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              Envíos
            </p>
            <p className="text-[11px] text-[#A09098]">
              <strong className="text-white">Los paquetes se envían el día siguiente a la compra</strong> tras la confirmación con tu vendedora.
            </p>
          </div>
        </div>
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
