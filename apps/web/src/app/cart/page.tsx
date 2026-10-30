'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowLeft, Upload, CheckCircle2, ShieldAlert, CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import { useCart } from '../../lib/cart-context';
import { apiClient } from '../../lib/api';
import { clearCheckoutIdempotencyKey, getCheckoutIdempotencyKey } from '../../lib/checkout-idempotency';
import {
  formatGuatemalanPhone,
  getGuatemalanPhoneDigits,
  isValidGuatemalanPhone,
} from '../../lib/guatemalan-phone';

const CONFIRMATION_FEEDBACK_MS = 800;

export default function CartPage() {
  const router = useRouter();
  const { items, isInitialized, removeItem, updateQuantity, clearCart, totalEstimated } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('El comprobante excede el límite permitido de 5 MB.');
      setPaymentProofFile(null);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Formato no permitido. Solo se aceptan JPEG, PNG o PDF.');
      setPaymentProofFile(null);
      return;
    }

    setErrorMessage(null);
    setPaymentProofFile(file);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor ingresa tu nombre y número de teléfono.');
      return;
    }

    if (!isValidGuatemalanPhone(customerPhone)) {
      setErrorMessage('Ingresa un número válido de Guatemala con 8 dígitos.');
      return;
    }

    if (paymentMethod === 'TRANSFER' && !paymentProofFile) {
      setErrorMessage('Para pagos por transferencia es obligatorio adjuntar la foto o PDF del comprobante.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const customerPhoneDigits = getGuatemalanPhoneDigits(customerPhone);
      const orderPayloadItems = items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));
      const requestFingerprint = JSON.stringify({
        customerName: customerName.trim(),
        customerPhone: customerPhoneDigits,
        paymentMethod,
        items: orderPayloadItems,
        proof: paymentProofFile
          ? {
              name: paymentProofFile.name,
              size: paymentProofFile.size,
              type: paymentProofFile.type,
              lastModified: paymentProofFile.lastModified,
            }
          : null,
      });
      const idempotencyKey = getCheckoutIdempotencyKey(sessionStorage, requestFingerprint);

      let result: { publicCode: string; total: string; payment: { method: string } };

      if (paymentMethod === 'CASH') {
        result = await apiClient<{ publicCode: string; total: string; payment: { method: string } }>(
          'orders',
          {
            method: 'POST',
            idempotencyKey,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: customerName.trim(),
              customerPhone: customerPhoneDigits,
              paymentMethod: 'CASH',
              items: orderPayloadItems,
            }),
          },
        );
      } else {
        const formData = new FormData();
        formData.append('customerName', customerName.trim());
        formData.append('customerPhone', customerPhoneDigits);
        formData.append('paymentMethod', 'TRANSFER');
        formData.append('items', JSON.stringify(orderPayloadItems));
        if (paymentProofFile) {
          formData.append('paymentProof', paymentProofFile);
        }

        result = await apiClient<{ publicCode: string; total: string; payment: { method: string } }>(
          'orders',
          {
            method: 'POST',
            idempotencyKey,
            body: formData,
          },
        );
      }

      clearCheckoutIdempotencyKey(sessionStorage);
      setIsRedirecting(true);
      clearCart();
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, CONFIRMATION_FEEDBACK_MS);
      });
      router.push(`/order-confirmation?code=${encodeURIComponent(result.publicCode)}`);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Ocurrió un error al procesar tu pedido. Si persiste, conserva tu clave de reintento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || isRedirecting) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="motion-feedback mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center space-y-4 rounded-2xl border border-[rgba(255,45,155,0.2)] bg-[#0D0A0C] p-8 text-center shadow-[0_0_25px_rgba(255,45,155,0.1)]"
      >
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-sakura/25 border-t-sakura"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-xl font-bold text-white">
            {isRedirecting ? 'Pedido confirmado' : 'Cargando tu carrito'}
          </h1>
          <p className="mt-2 text-sm text-[#A09098]">
            {isRedirecting
              ? 'Estamos preparando la confirmación de tu pedido.'
              : 'Estamos recuperando tus productos guardados.'}
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="motion-confirmation text-center py-20 bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.2)] max-w-2xl mx-auto p-8 space-y-4 shadow-[0_0_25px_rgba(255,45,155,0.1)]">
        <div className="w-16 h-16 bg-[rgba(255,45,155,0.1)] text-sakura rounded-full flex items-center justify-center mx-auto border border-[rgba(255,45,155,0.3)] shadow-[0_0_15px_rgba(255,45,155,0.2)]">
          <ShoppingBag className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-white">Tu carrito está vacío</h1>
        <p className="text-[#A09098] text-sm max-w-md mx-auto">
          Explora nuestro catálogo para añadir productos y labiales antes de finalizar tu pedido.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-sakura-700 hover:bg-sakura-600 text-white rounded-xl text-sm font-bold transition-[background-color,transform,box-shadow] duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(255,45,155,0.3)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="motion-enter max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-sm font-medium text-[#C2B6BC] hover:text-sakura transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Seguir comprando</span>
        </Link>
        <h1 className="text-2xl font-black text-white">Finalizar Pedido</h1>
      </div>

      <div className="motion-stagger grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Lista de productos en el carrito */}
        <div style={{ '--motion-index': 0 } as React.CSSProperties} className="motion-stagger-item lg:col-span-7 bg-[#0D0A0C] rounded-xl border border-[rgba(255,45,155,0.2)] p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-white border-b border-[rgba(255,255,255,0.08)] pb-3">
            Resumen de Productos ({items.length})
          </h2>

          <div className="motion-stagger divide-y divide-[rgba(255,255,255,0.05)]">
            {items.map((item, index) => (
              <div
                key={item.variantId}
                style={{ '--motion-index': index % 8 } as React.CSSProperties}
                className="motion-stagger-item py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(255,45,155,0.25)] bg-white/95 text-xs font-bold text-sakura">
                    {item.imagePath ? (
                      <Image
                        src={item.imagePath}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      item.variantName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.productName}</p>
                    <p className="text-xs text-[#96878F]">Tono: {item.variantName}</p>
                    <p className="text-xs font-bold text-sakura mt-0.5">
                      Q{parseFloat(item.price).toFixed(2)} c/u
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#131014]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-l-lg"
                    >
                      -
                    </button>
                    <span key={item.quantity} className="motion-value-change px-3 py-1 text-xs font-bold text-white">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-r-lg"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 flex justify-between items-center text-sm font-medium">
            <span className="text-[#A09098]">Total estimado:</span>
            <span key={totalEstimated} className="motion-value-change text-2xl font-black text-sakura">Q{totalEstimated.toFixed(2)}</span>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Checkout */}
        <div style={{ '--motion-index': 1 } as React.CSSProperties} className="motion-stagger-item lg:col-span-5 bg-[#0D0A0C] rounded-xl border border-[rgba(255,45,155,0.2)] p-6 space-y-6 shadow-sm">
          <h2 className="font-bold text-white border-b border-[rgba(255,255,255,0.08)] pb-3">
            Datos del Cliente y Pago
          </h2>

          {errorMessage && (
            <div role="alert" className="motion-feedback bg-red-950/40 border border-red-500/40 text-red-200 px-4 py-3 rounded-lg text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs font-bold text-[#A09098] uppercase tracking-wider mb-1">
                Tu Nombre Completo *
              </label>
              <input
                id="customer-name"
                type="text"
                required
                autoComplete="name"
                aria-describedby="customer-name-help"
                placeholder="Ej. Sofia Méndez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-[#F8F0F5] placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
              />
              <p id="customer-name-help" className="mt-1 text-[11px] text-[#A09098]">Escribe el nombre de quien recibirá el pedido.</p>
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-xs font-bold text-[#A09098] uppercase tracking-wider mb-1">
                Teléfono de Contacto *
              </label>
              <input
                id="customer-phone"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                aria-describedby="customer-phone-help"
                aria-invalid={customerPhone.length === 9 && !isValidGuatemalanPhone(customerPhone)}
                placeholder="Ej. 2322-1231"
                value={customerPhone}
                maxLength={9}
                pattern="[2-7][0-9]{3}-[0-9]{4}"
                title="Ingresa un número de Guatemala con el formato 2322-1231"
                onChange={(event) => setCustomerPhone(formatGuatemalanPhone(event.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-[#F8F0F5] placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
              />
              <p id="customer-phone-help" className="mt-1 text-[11px] text-[#A09098]">Número de Guatemala de 8 dígitos.</p>
            </div>

            <fieldset>
              <legend className="block text-xs font-bold text-[#A09098] uppercase tracking-wider mb-2">
                Método de Pago *
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  aria-pressed={paymentMethod === 'CASH'}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] ${
                    paymentMethod === 'CASH'
                      ? 'border-sakura bg-[rgba(255,45,155,0.15)] text-white shadow-[0_0_15px_rgba(255,45,155,0.25)]'
                      : 'border-[rgba(255,255,255,0.08)] text-[#96878F] hover:bg-white/5'
                  }`}
                >
                  <Banknote className="w-5 h-5 mb-1 text-sakura" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  aria-pressed={paymentMethod === 'TRANSFER'}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-sakura bg-[rgba(255,45,155,0.15)] text-white shadow-[0_0_15px_rgba(255,45,155,0.25)]'
                      : 'border-[rgba(255,255,255,0.08)] text-[#96878F] hover:bg-white/5'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1 text-sakura" />
                  <span>Transferencia</span>
                </button>
              </div>
            </fieldset>

            {/* Subida de comprobante si es transferencia */}
            {paymentMethod === 'TRANSFER' && (
              <div className="motion-feedback space-y-2 p-3 bg-[#131014] border border-[rgba(255,45,155,0.3)] rounded-xl text-xs">
                <label htmlFor="payment-proof" className="block font-bold text-sakura">
                  Comprobante de Transferencia (Obligatorio) *
                </label>
                <div className="border-2 border-dashed border-[rgba(255,45,155,0.4)] rounded-lg p-4 text-center bg-[#0D0A0C] hover:bg-[rgba(255,45,155,0.05)] transition-colors cursor-pointer relative">
                  <Upload className="w-6 h-6 text-sakura mx-auto mb-1" />
                  <span className="text-[#C2B6BC] text-xs block">
                    {paymentProofFile ? paymentProofFile.name : 'Haz clic o arrastra tu archivo (JPEG, PNG o PDF)'}
                  </span>
                  <span className="text-[10px] text-[#96878F] block mt-0.5">Máximo 5 MB</span>
                  <input
                    id="payment-proof"
                    type="file"
                    required
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm transition-[color,background-color,box-shadow,transform] duration-200 shadow-[0_0_20px_rgba(255,45,155,0.3)] flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-sakura-700 hover:bg-sakura-600 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando pedido seguro...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Obtener Código</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center space-y-1">
              <p className="text-[11px] text-[#C2B6BC]">
                📦 <strong>Envíos:</strong> Los paquetes se envían el día siguiente a la compra.
              </p>
              <p className="text-[10px] text-[#A09098]">
                Al confirmar aceptas nuestras{' '}
                <Link href="/politicas" className="text-sakura underline hover:text-sakura-glow">
                  políticas de servicio y entrega
                </Link>.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
