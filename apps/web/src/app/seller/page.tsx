'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api';

interface SellerOrder {
  id: string;
  publicCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: string;
  commissionAmount: string;
  createdAt: string;
  customer: { name: string; phone: string };
  payment: { method: 'CASH' | 'TRANSFER'; status: string; cashReceivedAt: string | null };
  commission: { amount: string; status: 'PENDING' | 'APPROVED' | 'PAID' } | null;
  items: Array<{
    productNameSnapshot: string;
    variantNameSnapshot: string;
    unitPrice: string;
    quantity: number;
    subtotal: string;
  }>;
}

interface CommissionSummary {
  pendingAmount: string;
  approvedAmount: string;
  paidAmount: string;
  totalAmount: string;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
}

export default function SellerPortalPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  const [claimCode, setClaimCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [commissionsSummary, setCommissionsSummary] = useState<CommissionSummary | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Acción de marcar efectivo
  const [markingCashId, setMarkingCashId] = useState<string | null>(null);

  const loadSellerData = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const [ordersData, commsData] = await Promise.all([
        apiClient<SellerOrder[]>('seller/orders', { token }),
        apiClient<{ summary: CommissionSummary }>('seller/commissions', { token }),
      ]);
      setOrders(ordersData);
      setCommissionsSummary(commsData.summary);
    } catch {
      // Manejado silenciosamente en recargas
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SELLER')) {
      router.push('/login');
    } else if (user && token) {
      void loadSellerData();
    }
  }, [user, token, authLoading, router, loadSellerData]);

  const handleClaimOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim() || !token) return;

    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const claimed = await apiClient<SellerOrder>('seller/orders/claim', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicCode: claimCode.trim().toUpperCase() }),
      });

      setClaimSuccess(`¡Pedido ${claimed.publicCode} reclamado y asignado exitosamente!`);
      setClaimCode('');
      await loadSellerData();
    } catch (err: any) {
      setClaimError(err.message || 'No se pudo reclamar el pedido. Verifica el código.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleMarkCashReceived = async (orderId: string) => {
    if (!token) return;
    setMarkingCashId(orderId);
    try {
      await apiClient(`seller/orders/${orderId}/cash-received`, {
        method: 'POST',
        token,
      });
      await loadSellerData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar recepción de efectivo.');
    } finally {
      setMarkingCashId(null);
    }
  };

  if (authLoading || (!user && !claimError)) {
    return <div className="text-center py-20 text-gray-500 text-sm">Cargando portal de vendedor...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header del Vendedor */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-rose-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sakura-600">Portal Vendedora</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
            Hola, {user?.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Reclama pedidos de tus clientes, marca pagos en efectivo y consulta tus comisiones.
          </p>
        </div>

        {/* Resumen de Comisiones */}
        {commissionsSummary && (
          <div className="flex gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 min-w-[120px]">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Pendientes</span>
              <span className="text-lg font-extrabold text-amber-900">Q{commissionsSummary.pendingAmount}</span>
              <span className="text-[10px] text-amber-700 block">{commissionsSummary.pendingCount} pedidos</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 min-w-[120px]">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Aprobadas</span>
              <span className="text-lg font-extrabold text-emerald-900">Q{commissionsSummary.approvedAmount}</span>
              <span className="text-[10px] text-emerald-700 block">{commissionsSummary.approvedCount} confirmados</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 min-w-[120px]">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Pagadas</span>
              <span className="text-lg font-extrabold text-rose-900">Q{commissionsSummary.paidAmount}</span>
              <span className="text-[10px] text-rose-700 block">{commissionsSummary.paidCount} liquidadas</span>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de Reclamo de Pedido */}
      <div className="bg-gradient-to-r from-rose-500 to-sakura-600 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-rose-200" />
          <h2 className="text-lg font-bold">Reclamar Pedido con Código</h2>
        </div>
        <p className="text-xs text-rose-100 max-w-xl">
          Pide el código al cliente (ej. <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded">VNT-8F2K91</span>) e ingrésalo aquí. El sistema te asignará el pedido atómicamente si no pertenece a otro vendedor.
        </p>

        {claimError && (
          <div className="bg-red-500/80 text-white border border-red-300 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{claimError}</span>
          </div>
        )}

        {claimSuccess && (
          <div className="bg-emerald-500/90 text-white border border-emerald-300 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{claimSuccess}</span>
          </div>
        )}

        <form onSubmit={handleClaimOrder} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              placeholder="VNT-XXXXXX"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-gray-900 text-sm uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
          <button
            type="submit"
            disabled={isClaiming}
            className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95 disabled:bg-gray-700"
          >
            {isClaiming ? (
              <span>Reclamando...</span>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4" />
                <span>Reclamar Pedido</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Lista de Pedidos Asignados */}
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Mis Pedidos Asignados ({orders.length})</h2>

        {loadingOrders ? (
          <div className="text-center py-10 text-xs text-gray-500">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl space-y-2">
            <p className="text-gray-500 text-sm">No tienes pedidos asignados actualmente.</p>
            <p className="text-xs text-gray-400">Reclama un pedido con el código que te proporcione tu cliente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => {
              const isCash = ord.payment.method === 'CASH';
              const cashReceived = ord.payment.cashReceivedAt !== null;

              return (
                <div
                  key={ord.id}
                  className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-rose-200 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm bg-rose-50 text-sakura-700 px-2.5 py-1 rounded-lg">
                        {ord.publicCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.status === 'CONFIRMED'
                          ? 'VENTA CONFIRMADA'
                          : ord.status === 'CANCELLED'
                          ? 'CANCELADO'
                          : 'PENDIENTE'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-800">Cliente:</span> {ord.customer.name} (
                        {ord.customer.phone})
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Método de Pago:</span>{' '}
                        {isCash ? 'Efectivo' : 'Transferencia'}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2.5 text-[11px] text-gray-600 space-y-1">
                      <span className="font-semibold text-gray-700 block">Productos:</span>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.quantity}x {it.productNameSnapshot} ({it.variantNameSnapshot})
                          </span>
                          <span className="font-mono">Q{parseFloat(it.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Total / Tu Comisión</span>
                      <div className="text-xs">
                        <span className="font-bold text-gray-900">Q{parseFloat(ord.totalAmount).toFixed(2)}</span>
                        <span className="text-emerald-700 font-bold ml-1.5">
                          (+Q{parseFloat(ord.commissionAmount).toFixed(2)})
                        </span>
                      </div>
                    </div>

                    {/* Botón de marcar efectivo recibido */}
                    {isCash && ord.status === 'PENDING' && (
                      <div>
                        {cashReceived ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Efectivo Recibido</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkCashReceived(ord.id)}
                            disabled={markingCashId === ord.id}
                            className="flex items-center space-x-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>
                              {markingCashId === ord.id ? 'Registrando...' : 'Marcar Efectivo Recibido'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
