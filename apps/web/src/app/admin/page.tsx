'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Download,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiClient, apiDownload } from '../../lib/api';
import { PageSkeleton } from '../../components/page-skeleton';
import {
  firstDayOfLocalMonth,
  filterAdminOrders,
  formatLocalDateInput,
  paymentVerificationAvailability,
} from './admin-view-model';

interface DashboardMetrics {
  sales: {
    today: { totalAmount: string; ordersCount: number };
    week: { totalAmount: string; ordersCount: number };
    month: { totalAmount: string; ordersCount: number };
    year: { totalAmount: string; ordersCount: number };
  };
  ordersByStatus: { PENDING: number; CONFIRMED: number; CANCELLED: number };
  commissions: {
    pendingAmount: string;
    approvedAmount: string;
    paidAmount: string;
    totalAmount: string;
  };
  topSellers: Array<{
    sellerId: string;
    sellerName: string;
    confirmedSalesAmount: string;
    confirmedOrdersCount: number;
  }>;
}

interface AdminOrder {
  id: string;
  publicCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: string;
  commissionAmount: string;
  createdAt: string;
  customer: { name: string; phone: string };
  seller: { id: string; displayName: string; isActive: boolean } | null;
  payment: {
    id: string;
    method: 'CASH' | 'TRANSFER';
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    cashReceivedAt: string | null;
    proofs: Array<{ id: string; reviewStatus: string }>;
  } | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING');
  const [orderCodeQuery, setOrderCodeQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal de Comprobante
  const [signedUrlData, setSignedUrlData] = useState<{ url: string; orderCode: string } | null>(null);
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);

  // Decisión de Pago
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    orderId: string;
    orderCode: string;
    decision: 'VERIFIED' | 'REJECTED';
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const paymentDialogRef = useRef<HTMLDivElement>(null);
  const decisionTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Rango de fechas para exportar CSV
  const [reportStartDate, setReportStartDate] = useState(() => {
    return firstDayOfLocalMonth(new Date());
  });
  const [reportEndDate, setReportEndDate] = useState(() => formatLocalDateInput(new Date()));
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [dash, ords] = await Promise.all([
        apiClient<DashboardMetrics>('admin/dashboard', { token }),
        apiClient<AdminOrder[]>('admin/orders?limit=100', { token }),
      ]);
      setDashboard(dash);
      setOrders(ords);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información del panel de administración.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    } else if (user && token) {
      void loadAdminData();
    }
  }, [user, token, authLoading, router, loadAdminData]);

  const handleViewProof = async (order: AdminOrder) => {
    if (!token) return;
    setLoadingProofId(order.id);
    try {
      const result = await apiClient<{ url: string }>(`admin/orders/${order.id}/payment-proof-url`, {
        token,
      });
      setSignedUrlData({ url: result.url, orderCode: order.publicCode });
    } catch (err: any) {
      alert(err.message || 'No se pudo obtener el comprobante.');
    } finally {
      setLoadingProofId(null);
    }
  };

  useEffect(() => {
    if (!pendingDecision && !signedUrlData) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (pendingDecision && processingPaymentId === pendingDecision.orderId) return;
      setPendingDecision(null);
      setSignedUrlData(null);
      setRejectionReason('');
      setActionError(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingDecision, processingPaymentId, signedUrlData]);

  useEffect(() => {
    if (!pendingDecision) return;
    return () => decisionTriggerRef.current?.focus();
  }, [pendingDecision]);

  const trapPaymentDialogFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = paymentDialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleVerifyPayment = async () => {
    if (!token || !pendingDecision) return;
    const reason = rejectionReason.trim();
    if (pendingDecision.decision === 'REJECTED' && !reason) {
      setActionError('Escribe el motivo del rechazo para que quede registrado.');
      return;
    }

    setActionError(null);
    setProcessingPaymentId(pendingDecision.orderId);
    try {
      await apiClient(`admin/orders/${pendingDecision.orderId}/verify-payment`, {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: pendingDecision.decision,
          rejectionReason: pendingDecision.decision === 'REJECTED' ? reason : undefined,
        }),
      });
      await loadAdminData();
      setPendingDecision(null);
      setRejectionReason('');
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo procesar la decisión.');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleDownloadCsv = async () => {
    if (!token) return;
    setIsDownloadingReport(true);
    setActionError(null);
    try {
      const blob = await apiDownload(
        `admin/reports/sales?startDate=${reportStartDate}&endDate=${reportEndDate}&format=csv`,
        token,
      );
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ventas-${reportStartDate}-a-${reportEndDate}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo descargar el reporte CSV.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  if (authLoading || !user || user.role !== 'ADMIN') {
    return <PageSkeleton label="Cargando panel de administración" />;
  }

  const filteredOrders = filterAdminOrders(orders, selectedFilter, orderCodeQuery);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {loadError && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}
      {actionError && !pendingDecision && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">{actionError}</div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0D0A0C] p-6 rounded-2xl border border-[rgba(255,45,155,0.2)] shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sakura">Panel Administradora</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Métricas y Operaciones</h1>
          <p className="text-xs text-[#A09098]">
            Control de ventas confirmadas, verificación de transferencias y reportes de Sakura Makeup.
          </p>
        </div>

        {/* Exportación CSV */}
        <div className="flex items-center gap-2 bg-[#131014] p-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-xs">
          <Calendar className="w-4 h-4 text-sakura ml-1" aria-hidden="true" />
          <label htmlFor="report-start-date" className="sr-only">Fecha inicial del reporte</label>
          <input
            id="report-start-date"
            type="date"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
            className="border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs bg-[#080608] text-white"
          />
          <span className="text-gray-500">a</span>
          <label htmlFor="report-end-date" className="sr-only">Fecha final del reporte</label>
          <input
            id="report-end-date"
            type="date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
            className="border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs bg-[#080608] text-white"
          />
          <button
            type="button"
            onClick={() => void handleDownloadCsv()}
            disabled={isDownloadingReport}
            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloadingReport ? 'animate-pulse' : ''}`} aria-hidden="true" />
            <span>{isDownloadingReport ? 'Descargando…' : 'Descargar CSV'}</span>
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0A0C] p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[#A09098] uppercase tracking-wider">Ventas Hoy</span>
            <div className="text-2xl font-black text-white">Q{dashboard.sales.today.totalAmount}</div>
            <span className="text-xs text-emerald-400 font-medium">
              {dashboard.sales.today.ordersCount} ventas confirmadas
            </span>
          </div>

          <div className="bg-[#0D0A0C] p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[#A09098] uppercase tracking-wider">Esta Semana</span>
            <div className="text-2xl font-black text-white">Q{dashboard.sales.week.totalAmount}</div>
            <span className="text-xs text-emerald-400 font-medium">
              {dashboard.sales.week.ordersCount} ventas confirmadas
            </span>
          </div>

          <div className="bg-[#0D0A0C] p-5 rounded-2xl border border-[rgba(255,45,155,0.3)] shadow-[0_0_20px_rgba(255,45,155,0.1)] space-y-1">
            <span className="text-[10px] font-bold text-sakura uppercase tracking-wider">Este Mes</span>
            <div className="text-2xl font-black text-sakura">Q{dashboard.sales.month.totalAmount}</div>
            <span className="text-xs text-emerald-400 font-medium">
              {dashboard.sales.month.ordersCount} ventas confirmadas
            </span>
          </div>

          <div className="bg-[#0D0A0C] p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[#A09098] uppercase tracking-wider">Comisiones Aprobadas</span>
            <div className="text-2xl font-black text-emerald-400">Q{dashboard.commissions.approvedAmount}</div>
            <span className="text-xs text-[#A09098] font-medium">
              (Q{dashboard.commissions.pendingAmount} pendientes)
            </span>
          </div>
        </div>
      )}

      {/* Gestión de Pedidos y Verificación de Pagos */}
      <div className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.2)] p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
          <h2 className="text-lg font-bold text-white">Gestión de Pedidos</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-64">
              <label htmlFor="order-code-search" className="sr-only">
                Buscar venta por código
              </label>
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A09098]" />
              <input
                id="order-code-search"
                type="search"
                value={orderCodeQuery}
                maxLength={10}
                placeholder="Buscar código VNT-..."
                onChange={(event) => {
                  const value = event.target.value.toUpperCase();
                  setOrderCodeQuery(value);
                  if (value.trim()) setSelectedFilter('ALL');
                }}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#131014] py-1.5 pl-9 pr-8 text-xs font-semibold uppercase text-white placeholder:normal-case placeholder:text-[#A09098] focus:border-sakura focus:outline-none focus:ring-1 focus:ring-sakura"
              />
              {orderCodeQuery && (
                <button
                  type="button"
                  onClick={() => setOrderCodeQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#A09098] hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
            {(['PENDING', 'CONFIRMED', 'ALL'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFilter === filter
                    ? 'bg-sakura-700 text-white shadow-[0_0_15px_rgba(255,45,155,0.3)]'
                    : 'bg-[#131014] text-[#A09098] hover:text-white border border-[rgba(255,255,255,0.05)]'
                }`}
              >
                {filter === 'PENDING' ? 'Pendientes de Pago' : filter === 'CONFIRMED' ? 'Confirmados' : 'Todos'}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Tabla de Pedidos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#C2B6BC]">
            <thead className="bg-[#131014] text-[#A09098] uppercase tracking-wider font-semibold text-[10px] border-b border-[rgba(255,255,255,0.05)]">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Vendedora</th>
                <th className="py-3 px-3">Método / Estado</th>
                <th className="py-3 px-3">Total / Comisión</th>
                <th className="py-3 px-3 text-right">Acciones de Verificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#A09098]">
                    Cargando pedidos y métricas...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#A09098]">
                    {orderCodeQuery
                      ? `No se encontró una venta con el código ${orderCodeQuery}.`
                      : 'No hay pedidos con el filtro seleccionado.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isTransfer = ord.payment?.method === 'TRANSFER';
                  const hasProof = ord.payment?.proofs && ord.payment.proofs.length > 0;
                  const isProcessing = processingPaymentId === ord.id;
                  const verification = paymentVerificationAvailability(ord);

                  return (
                    <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">{ord.publicCode}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{ord.customer.name}</div>
                        <div className="text-[11px] text-[#A09098]">{ord.customer.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        {ord.seller ? (
                          <span className="font-medium text-white">{ord.seller.displayName}</span>
                        ) : (
                          <span className="text-amber-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white">{isTransfer ? 'Transferencia' : 'Efectivo'}</span>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              ord.status === 'CONFIRMED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : ord.status === 'CANCELLED'
                                ? 'bg-gray-900 text-gray-400 border border-gray-700'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">Q{parseFloat(ord.totalAmount).toFixed(2)}</div>
                        <div className="text-[10px] text-sakura">
                          Comisión: Q{parseFloat(ord.commissionAmount).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {isTransfer && hasProof && (
                          <button
                            onClick={() => handleViewProof(ord)}
                            disabled={loadingProofId === ord.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#1A151A] hover:bg-[#30272E] text-white border border-[rgba(255,45,155,0.3)] rounded-lg text-[11px] font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-sakura" />
                            <span>{loadingProofId === ord.id ? 'Cargando...' : 'Comprobante'}</span>
                          </button>
                        )}

                        {ord.status === 'PENDING' && ord.seller && (
                          <>
                            <button
                              onClick={(event) => {
                                decisionTriggerRef.current = event.currentTarget;
                                setActionError(null);
                                setPendingDecision({ orderId: ord.id, orderCode: ord.publicCode, decision: 'VERIFIED' });
                              }}
                              disabled={isProcessing || !verification.canVerify}
                              title={verification.reason ?? 'Confirmar venta'}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirmar Venta</span>
                            </button>

                            {isTransfer && (
                              <button
                                onClick={(event) => {
                                  decisionTriggerRef.current = event.currentTarget;
                                  setActionError(null);
                                  setPendingDecision({ orderId: ord.id, orderCode: ord.publicCode, decision: 'REJECTED' });
                                }}
                                disabled={isProcessing}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-lg text-[11px] font-bold transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rechazar</span>
                              </button>
                            )}
                          </>
                        )}
                        {ord.status === 'PENDING' && ord.seller && verification.reason && (
                          <span className="block pt-1 text-[10px] text-amber-300">
                            {verification.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div ref={paymentDialogRef} onKeyDown={trapPaymentDialogFocus} role="dialog" aria-modal="true" aria-labelledby="payment-decision-title" aria-describedby="payment-decision-description" className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0D0A0C] p-6 shadow-2xl">
            <header className="border-b border-white/10 pb-4">
              <h2 id="payment-decision-title" className="text-xl font-bold text-white">
                {pendingDecision.decision === 'VERIFIED' ? 'Confirmar venta' : 'Rechazar pago'}
              </h2>
            </header>
            <div className="py-5">
              <p id="payment-decision-description" className="text-sm leading-6 text-[#C2B6BC]">
                Pedido <span className="font-mono font-bold text-white">{pendingDecision.orderCode}</span>. Esta decisión actualiza el estado financiero y quedará registrada.
              </p>
              {pendingDecision.decision === 'REJECTED' && (
                <div className="mt-4">
                  <label htmlFor="rejection-reason" className="block text-sm font-bold text-white">Motivo del rechazo</label>
                  <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} aria-describedby="rejection-reason-help" rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-[#131014] px-3 py-2 text-sm text-white focus:border-sakura focus:outline-none focus:ring-2 focus:ring-sakura/30" />
                  <p id="rejection-reason-help" className="mt-1 text-xs text-[#A09098]">Explica qué debe corregirse antes de volver a enviar el comprobante.</p>
                </div>
              )}
              {actionError && <p role="alert" className="mt-4 text-sm text-red-300">{actionError}</p>}
            </div>
            <footer className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <button type="button" autoFocus disabled={processingPaymentId === pendingDecision.orderId} onClick={() => { setPendingDecision(null); setRejectionReason(''); setActionError(null); }} className="rounded-xl px-4 py-2 text-sm font-bold text-[#C2B6BC] hover:bg-white/5 disabled:cursor-wait disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void handleVerifyPayment()} disabled={processingPaymentId === pendingDecision.orderId} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${pendingDecision.decision === 'VERIFIED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-700 hover:bg-red-600'}`}>
                {processingPaymentId === pendingDecision.orderId ? 'Procesando…' : pendingDecision.decision === 'VERIFIED' ? 'Confirmar' : 'Rechazar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Previsualización de Comprobante Privado */}
      {signedUrlData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="proof-dialog-title" className="bg-[#0D0A0C] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-[0_0_50px_rgba(255,45,155,0.25)] border border-[rgba(255,45,155,0.3)]">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div>
                <h3 id="proof-dialog-title" className="font-bold text-white">Revisar comprobante</h3>
                <span className="text-xs text-sakura font-mono">Pedido: {signedUrlData.orderCode}</span>
              </div>
              <button
                type="button"
                onClick={() => setSignedUrlData(null)}
                aria-label="Cerrar comprobante"
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="aspect-[4/3] bg-[#080608] rounded-xl overflow-hidden flex items-center justify-center border border-[rgba(255,255,255,0.05)]">
              {signedUrlData.url.toLowerCase().includes('.pdf') ? (
                <iframe src={signedUrlData.url} className="w-full h-full" title="Comprobante PDF" />
              ) : (
                <img
                  src={signedUrlData.url}
                  alt="Comprobante de Pago"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-[#96878F]">
              <span>* URL firmada privada (expira en 5 minutos).</span>
              <button
                type="button"
                onClick={() => setSignedUrlData(null)}
                className="px-4 py-2 bg-sakura-700 hover:bg-sakura-600 text-white font-bold rounded-xl text-xs transition-colors shadow-[0_0_15px_rgba(255,45,155,0.3)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
