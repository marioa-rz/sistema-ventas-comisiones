'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  CheckCircle,
  AlertCircle,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { PageSkeleton } from '../../components/page-skeleton';
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const [markingCashId, setMarkingCashId] = useState<string | null>(null);

  const loadSellerData = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    setLoadError(null);
    try {
      const [ordersData, commsData] = await Promise.all([
        apiClient<SellerOrder[]>('seller/orders', { token }),
        apiClient<{ summary: CommissionSummary }>('seller/commissions', { token }),
      ]);
      setOrders(ordersData);
      setCommissionsSummary(commsData.summary);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información del portal de vendedora.',
      );
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SELLER')) {
      router.replace('/login');
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

  if (authLoading || !user || user.role !== 'SELLER') {
    return <PageSkeleton label="Cargando portal de vendedora" />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {loadError && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}
      {/* Header del Vendedor */}
      <div className="bg-[#0D0A0C] rounded-2xl p-6 sm:p-8 border border-[rgba(255,45,155,0.2)] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sakura">Portal Vendedora</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Hola, {user?.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-[#A09098]">
            Reclama pedidos de tus clientes, marca pagos en efectivo y consulta tus comisiones en Sakura Makeup.
          </p>
        </div>

        {/* Resumen de Comisiones */}
        {commissionsSummary && (
          <div className="flex gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="bg-[#131014] border border-amber-500/30 rounded-xl px-4 py-3 min-w-[120px]">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">Pendientes</span>
              <span className="text-xl font-black text-amber-300">Q{commissionsSummary.pendingAmount}</span>
              <span className="text-[10px] text-amber-400/80 block">{commissionsSummary.pendingCount} pedidos</span>
            </div>

            <div className="bg-[#131014] border border-emerald-500/30 rounded-xl px-4 py-3 min-w-[120px]">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">Aprobadas</span>
              <span className="text-xl font-black text-emerald-300">Q{commissionsSummary.approvedAmount}</span>
              <span className="text-[10px] text-emerald-400/80 block">{commissionsSummary.approvedCount} confirmados</span>
            </div>

            <div className="bg-[#131014] border border-sakura/30 rounded-xl px-4 py-3 min-w-[120px] shadow-[0_0_15px_rgba(255,45,155,0.15)]">
              <span className="text-[10px] font-bold text-sakura uppercase block">Pagadas</span>
              <span className="text-xl font-black text-white">Q{commissionsSummary.paidAmount}</span>
              <span className="text-[10px] text-[#A09098] block">{commissionsSummary.paidCount} liquidadas</span>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de Reclamo de Pedido */}
      <div className="bg-gradient-to-r from-[#1A0B14] via-[#0D0A0C] to-[#120810] border border-[rgba(255,45,155,0.3)] rounded-2xl p-6 text-white shadow-[0_0_30px_rgba(255,45,155,0.15)] space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-sakura" />
          <h2 className="text-lg font-bold">Reclamar Pedido con Código</h2>
        </div>
        <p className="text-xs text-[#C2B6BC] max-w-xl">
          Pide el código al cliente (ej. <span className="font-mono bg-[rgba(255,45,155,0.2)] text-sakura font-bold px-1.5 py-0.5 rounded">VNT-8F2K91</span>) e ingrésalo aquí. El sistema te asignará el pedido atómicamente.
        </p>

        {claimError && (
          <div role="alert" className="bg-red-950/60 text-red-200 border border-red-500/40 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{claimError}</span>
          </div>
        )}

        {claimSuccess && (
          <div role="status" className="bg-emerald-950/60 text-emerald-200 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{claimSuccess}</span>
          </div>
        )}

        <form onSubmit={handleClaimOrder} className="flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="claim-code" className="mb-1 block text-xs font-bold text-[#C2B6BC]">Código del pedido</label>
            <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              id="claim-code"
              type="text"
              required
              aria-describedby="claim-code-help"
              placeholder="VNT-XXXXXX"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#131014] text-white text-sm uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
            />
            </div>
            <p id="claim-code-help" className="mt-1 text-[11px] text-[#A09098]">Formato: VNT- seguido de seis letras o números.</p>
          </div>
          <button
            type="submit"
            disabled={isClaiming}
            className="px-6 py-2.5 rounded-xl bg-sakura-700 hover:bg-sakura-600 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(255,45,155,0.3)] flex items-center justify-center space-x-2 active:scale-95 disabled:bg-gray-800 disabled:text-gray-500"
          >
            {isClaiming ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /><span>Reclamando…</span></>
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
      <div className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.2)] p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-white">Mis Pedidos Asignados ({orders.length})</h2>

        {loadingOrders ? (
          <div aria-label="Cargando pedidos" className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 rounded-xl border border-white/5 bg-[#131014]" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl space-y-2">
            <p className="text-[#A09098] text-sm">No tienes pedidos asignados actualmente.</p>
            <p className="text-xs text-[#A09098]">Reclama un pedido con el código que te proporcione tu cliente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => {
              const isCash = ord.payment.method === 'CASH';
              const cashReceived = ord.payment.cashReceivedAt !== null;

              return (
                <div
                  key={ord.id}
                  className="bg-[#131014] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-[rgba(255,45,155,0.3)] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm bg-[rgba(255,45,155,0.15)] text-sakura border border-[rgba(255,45,155,0.3)] px-2.5 py-1 rounded-lg">
                        {ord.publicCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'CONFIRMED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : ord.status === 'CANCELLED'
                            ? 'bg-gray-900 text-gray-400 border border-gray-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ord.status === 'CONFIRMED'
                          ? 'VENTA CONFIRMADA'
                          : ord.status === 'CANCELLED'
                          ? 'CANCELADO'
                          : 'PENDIENTE'}
                      </span>
                    </div>

                    <div className="text-xs text-[#C2B6BC]">
                      <p>
                        <span className="font-semibold text-white">Cliente:</span> {ord.customer.name} (
                        {ord.customer.phone})
                      </p>
                      <p>
                        <span className="font-semibold text-white">Método:</span>{' '}
                        {isCash ? 'Efectivo' : 'Transferencia'}
                      </p>
                    </div>

                    <div className="bg-[#0D0A0C] rounded-lg p-2.5 text-[11px] text-[#A09098] space-y-1 border border-white/5">
                      <span className="font-semibold text-white block">Productos:</span>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.quantity}x {it.productNameSnapshot} ({it.variantNameSnapshot})
                          </span>
                          <span className="font-mono text-white">Q{parseFloat(it.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#A09098] block font-semibold uppercase">Total / Tu Comisión</span>
                      <div className="text-xs">
                        <span className="font-black text-white">Q{parseFloat(ord.totalAmount).toFixed(2)}</span>
                        <span className="text-sakura font-bold ml-1.5">
                          (+Q{parseFloat(ord.commissionAmount).toFixed(2)})
                        </span>
                      </div>
                    </div>

                    {isCash && ord.status === 'PENDING' && (
                      <div>
                        {cashReceived ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-semibold bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Efectivo Recibido</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkCashReceived(ord.id)}
                            disabled={markingCashId === ord.id}
                            className="flex items-center space-x-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            {markingCashId === ord.id && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />}
                            <span>
                              {markingCashId === ord.id ? 'Registrando...' : 'Marcar Efectivo'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {!isCash && ord.status === 'PENDING' && (
                      <span
                        className={`inline-flex max-w-[190px] items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                          ord.payment.status === 'REJECTED'
                            ? 'border-red-500/30 bg-red-950/40 text-red-300'
                            : 'border-amber-500/30 bg-amber-950/40 text-amber-300'
                        }`}
                      >
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {ord.payment.status === 'REJECTED'
                            ? 'Comprobante rechazado por administración'
                            : 'Pendiente de revisión administrativa'}
                        </span>
                      </span>
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
