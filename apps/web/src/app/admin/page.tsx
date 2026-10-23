'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Download,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api';

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
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Comprobante
  const [signedUrlData, setSignedUrlData] = useState<{ url: string; orderCode: string } | null>(null);
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);

  // Decisión de Pago
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  // Rango de fechas para exportar CSV
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadAdminData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [dash, ords] = await Promise.all([
        apiClient<DashboardMetrics>('admin/dashboard', { token }),
        apiClient<AdminOrder[]>('admin/orders?limit=50', { token }),
      ]);
      setDashboard(dash);
      setOrders(ords);
    } catch {
      // Manejado silenciosamente
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
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

  const handleVerifyPayment = async (orderId: string, decision: 'VERIFIED' | 'REJECTED') => {
    if (!token) return;

    let rejectionReason: string | undefined;
    if (decision === 'REJECTED') {
      const reason = prompt('Ingresa el motivo del rechazo del comprobante/pago:');
      if (!reason || !reason.trim()) return;
      rejectionReason = reason.trim();
    }

    setProcessingPaymentId(orderId);
    try {
      await apiClient(`admin/orders/${orderId}/verify-payment`, {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, rejectionReason }),
      });
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la verificación del pago.');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleDownloadCsv = () => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const csvUrl = `${apiUrl.replace(/\/$/, '')}/admin/reports/sales?startDate=${reportStartDate}&endDate=${reportEndDate}&format=csv`;

    fetch(csvUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ventas-${reportStartDate}-a-${reportEndDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Error al exportar reporte CSV.'));
  };

  if (authLoading || (!user && isLoading)) {
    return <div className="text-center py-20 text-[#A09098] text-sm">Cargando panel de administración...</div>;
  }

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'ALL') return true;
    return o.status === selectedFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0D0A0C] p-6 rounded-2xl border border-[rgba(255,45,155,0.2)] shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sakura">Panel Administradora</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Métricas y Operaciones</h1>
          <p className="text-xs text-[#A09098]">
            Control de ventas confirmadas, verificación de transferencias y reportes de Sakura Beauty.
          </p>
        </div>

        {/* Exportación CSV */}
        <div className="flex items-center gap-2 bg-[#131014] p-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-xs">
          <Calendar className="w-4 h-4 text-sakura ml-1" />
          <input
            type="date"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
            className="border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs bg-[#080608] text-white"
          />
          <span className="text-gray-500">a</span>
          <input
            type="date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
            className="border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs bg-[#080608] text-white"
          />
          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
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

          <div className="flex gap-2">
            {(['PENDING', 'CONFIRMED', 'ALL'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFilter === filter
                    ? 'bg-sakura text-white shadow-[0_0_15px_rgba(255,45,155,0.3)]'
                    : 'bg-[#131014] text-[#A09098] hover:text-white border border-[rgba(255,255,255,0.05)]'
                }`}
              >
                {filter === 'PENDING' ? 'Pendientes de Pago' : filter === 'CONFIRMED' ? 'Confirmados' : 'Todos'}
              </button>
            ))}
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#5C4E54]">
                    No hay pedidos con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isTransfer = ord.payment?.method === 'TRANSFER';
                  const hasProof = ord.payment?.proofs && ord.payment.proofs.length > 0;
                  const isProcessing = processingPaymentId === ord.id;

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
                              onClick={() => handleVerifyPayment(ord.id, 'VERIFIED')}
                              disabled={isProcessing}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirmar Venta</span>
                            </button>

                            {isTransfer && (
                              <button
                                onClick={() => handleVerifyPayment(ord.id, 'REJECTED')}
                                disabled={isProcessing}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-lg text-[11px] font-bold transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rechazar</span>
                              </button>
                            )}
                          </>
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

      {/* Modal de Previsualización de Comprobante Privado */}
      {signedUrlData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0A0C] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-[0_0_50px_rgba(255,45,155,0.25)] border border-[rgba(255,45,155,0.3)]">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div>
                <h3 className="font-bold text-white">Comprobante de Transferencia</h3>
                <span className="text-xs text-sakura font-mono">Pedido: {signedUrlData.orderCode}</span>
              </div>
              <button
                onClick={() => setSignedUrlData(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                ✕
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
                onClick={() => setSignedUrlData(null)}
                className="px-4 py-2 bg-sakura hover:bg-sakura-glow text-white font-bold rounded-xl text-xs transition-colors shadow-[0_0_15px_rgba(255,45,155,0.3)]"
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
