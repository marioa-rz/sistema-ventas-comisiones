'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowLeft, Upload, CheckCircle2, ShieldAlert, CreditCard, Banknote } from 'lucide-react';
import { useCart } from '../../lib/cart-context';
import { apiClient } from '../../lib/api';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalEstimated } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  // Clave de idempotencia local por intento
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (paymentMethod === 'TRANSFER' && !paymentProofFile) {
      setErrorMessage('Para pagos por transferencia es obligatorio adjuntar la foto o PDF del comprobante.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayloadItems = items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.price,
      }));

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
              customerPhone: customerPhone.trim(),
              paymentMethod: 'CASH',
              items: orderPayloadItems,
            }),
          },
        );
      } else {
        // Transferencia con multipart/form-data
        const formData = new FormData();
        formData.append('customerName', customerName.trim());
        formData.append('customerPhone', customerPhone.trim());
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

      // Limpiar carrito y redirigir
      clearCart();
      router.push(
        `/order-confirmation?code=${result.publicCode}&total=${result.total}&method=${result.payment.method}&name=${encodeURIComponent(
          customerName.trim(),
        )}`,
      );
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Ocurrió un error al procesar tu pedido. Si persiste, conserva tu clave de reintento.',
      );
      // Nota: No regeneramos idempotencyKey para permitir un reintento idempotente seguro
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-rose-100 max-w-2xl mx-auto p-8 space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-sakura-500 rounded-full flex items-center justify-center mx-auto">
          <Banknote className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Tu carrito está vacío</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Explora nuestro catálogo para añadir productos y labiales antes de finalizar tu pedido.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-sakura-600 hover:bg-sakura-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-sakura-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Seguir comprando</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Lista de productos en el carrito */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-rose-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-3">Resumen de Productos ({items.length})</h2>

          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.variantId} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 bg-rose-50 rounded-lg flex-shrink-0 flex items-center justify-center text-rose-300 font-bold text-xs">
                    {item.variantName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">Tono: {item.variantName}</p>
                    <p className="text-xs font-semibold text-sakura-600 mt-0.5">
                      Q{parseFloat(item.price).toFixed(2)} c/u
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-l-lg"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold text-gray-800">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-r-lg"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between items-center text-sm font-medium">
            <span className="text-gray-600">Total estimado (a confirmar por backend):</span>
            <span className="text-xl font-bold text-gray-900">Q{totalEstimated.toFixed(2)}</span>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Checkout */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-rose-100 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900 border-b pb-3">Datos del Cliente y Pago</h2>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Tu Nombre Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Sofia Méndez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sakura-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Teléfono de Contacto *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej. 55551234"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sakura-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Método de Pago *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-sakura-500 bg-rose-50 text-sakura-700 font-semibold shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 mb-1 text-sakura-600" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                    paymentMethod === 'TRANSFER'
                      ? 'border-sakura-500 bg-rose-50 text-sakura-700 font-semibold shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1 text-sakura-600" />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Subida de comprobante si es transferencia */}
            {paymentMethod === 'TRANSFER' && (
              <div className="space-y-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs">
                <label className="block font-semibold text-amber-900">
                  Comprobante de Transferencia (Obligatorio) *
                </label>
                <div className="border-2 border-dashed border-amber-300 rounded-lg p-4 text-center bg-white hover:bg-amber-50/30 transition-colors cursor-pointer relative">
                  <Upload className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                  <span className="text-gray-600 text-xs block">
                    {paymentProofFile ? paymentProofFile.name : 'Haz clic o arrastra tu archivo (JPEG, PNG o PDF)'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Máximo 5 MB</span>
                  <input
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
              className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-sakura-600 hover:bg-sakura-700 active:scale-[0.98]'
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
          </form>
        </div>
      </div>
    </div>
  );
}
