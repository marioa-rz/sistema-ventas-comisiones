'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  CheckCircle,
  AlertCircle,
  Banknote,
  Landmark,
  Save,
  Eye,
  X,
  Edit3,
  ShieldCheck,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Upload,
  CreditCard,
  Check,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { PageSkeleton } from '../../components/page-skeleton';
import { apiClient } from '../../lib/api';
import {
  formatGuatemalanPhone,
  getGuatemalanPhoneDigits,
  isValidGuatemalanPhone,
} from '../../lib/guatemalan-phone';
import {
  filterAndSortProducts,
  loadAllCatalogProducts,
  type Product,
} from '../catalog-view-model';

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
    productVariant?: {
      imagePath: string | null;
      product?: {
        mainImagePath: string | null;
      } | null;
    } | null;
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

interface SellerPayoutSettings {
  bankName: string | null;
  bankAccountNumber: string | null;
}

interface SellerCommissionPayout {
  id: string;
  amount: string;
  paidAt: string;
  status: 'COMPLETED' | 'CANCELLED';
  method: 'CASH' | 'TRANSFER';
  bankNameSnapshot: string | null;
  bankAccountNumberSnapshot: string | null;
  proofAvailable: boolean;
  reference: string | null;
  note: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  commissionsCount: number;
}

interface SellerDirectCartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  price: string;
  quantity: number;
  imagePath: string | null;
}

function calculateDirectTotal(items: SellerDirectCartItem[]): string {
  const sum = items.reduce((acc, it) => acc + (parseFloat(it.price) || 0) * it.quantity, 0);
  return sum.toFixed(2);
}

function calculateDirectCommission(items: SellerDirectCartItem[]): string {
  let comm = 0;
  for (const item of items) {
    const unitPrice = parseFloat(item.price) || 0;
    const rate = unitPrice >= 100 ? 0.20 : 0.10;
    comm += unitPrice * item.quantity * rate;
  }
  return comm.toFixed(2);
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
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [savedBankName, setSavedBankName] = useState('');
  const [savedBankAccountNumber, setSavedBankAccountNumber] = useState('');
  const [isEditingPayoutSettings, setIsEditingPayoutSettings] = useState(false);
  const [isSavingPayoutSettings, setIsSavingPayoutSettings] = useState(false);
  const [payoutSettingsMessage, setPayoutSettingsMessage] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<SellerCommissionPayout[]>([]);
  const [signedPayoutProofUrl, setSignedPayoutProofUrl] = useState<string | null>(null);
  const [loadingProofPayoutId, setLoadingProofPayoutId] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Venta Directa
  const [isRegisteringSale, setIsRegisteringSale] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<string, string>>({});
  const [sellerCartItems, setSellerCartItems] = useState<SellerDirectCartItem[]>([]);
  const [directCustomerName, setDirectCustomerName] = useState('');
  const [directCustomerPhone, setDirectCustomerPhone] = useState('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [directPaymentProofFile, setDirectPaymentProofFile] = useState<File | null>(null);
  const [cashAlreadyReceived, setCashAlreadyReceived] = useState(true);
  const [isSubmittingDirectSale, setIsSubmittingDirectSale] = useState(false);
  const [directSaleError, setDirectSaleError] = useState<string | null>(null);
  const [createdSaleResult, setCreatedSaleResult] = useState<{ publicCode: string; total: string; customerName: string } | null>(null);

  const [markingCashId, setMarkingCashId] = useState<string | null>(null);

  const loadSellerData = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    setLoadError(null);
    try {
      const [ordersData, commsData, payoutSettings, payoutsData] = await Promise.all([
        apiClient<SellerOrder[]>('seller/orders', { token }),
        apiClient<{ summary: CommissionSummary }>('seller/commissions', { token }),
        apiClient<SellerPayoutSettings>('seller/commissions/payout-settings', { token }),
        apiClient<SellerCommissionPayout[]>('seller/commissions/payouts', { token }),
      ]);
      setOrders(ordersData);
      setCommissionsSummary(commsData.summary);
      const bName = payoutSettings.bankName ?? '';
      const bAccount = payoutSettings.bankAccountNumber ?? '';
      setBankName(bName);
      setBankAccountNumber(bAccount);
      setSavedBankName(bName);
      setSavedBankAccountNumber(bAccount);
      if (!bName || !bAccount) {
        setIsEditingPayoutSettings(true);
      }
      setPayouts(payoutsData);
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
    if (authLoading) return;
    if (!user) {
      router.replace('/portal');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin');
    } else if (token) {
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

  const handleViewPayoutProof = async (payout: SellerCommissionPayout) => {
    if (!token) return;
    setLoadingProofPayoutId(payout.id);
    try {
      const result = await apiClient<{ url: string }>(
        `seller/commissions/payouts/${payout.id}/proof-url`,
        { token },
      );
      setSignedPayoutProofUrl(result.url);
    } catch (err: any) {
      alert(err.message || 'No se pudo obtener el comprobante.');
    } finally {
      setLoadingProofPayoutId(null);
    }
  };

  const filteredCatalogProducts = useMemo(() => {
    return filterAndSortProducts(catalogProducts, {
      searchQuery: catalogSearch,
      selectedCategory: selectedCatalogCategory,
      sortBy: 'featured',
    });
  }, [catalogProducts, catalogSearch, selectedCatalogCategory]);

  const openDirectSaleModal = async () => {
    setIsRegisteringSale(true);
    setCreatedSaleResult(null);
    setDirectSaleError(null);
    if (catalogProducts.length === 0) {
      setCatalogLoading(true);
      try {
        const [cats, prods] = await Promise.all([
          apiClient<Array<{ id: string; name: string }>>('categories'),
          loadAllCatalogProducts((limit, offset) =>
            apiClient<Product[]>(`products?limit=${limit}&offset=${offset}`),
          ),
        ]);
        setCatalogCategories(cats);
        setCatalogProducts(prods);
        const initialVariants: Record<string, string> = {};
        for (const p of prods) {
          const firstAvailable = p.variants.find((v) => v.isAvailable) ?? p.variants[0];
          if (firstAvailable) initialVariants[p.id] = firstAvailable.id;
        }
        setSelectedProductVariants(initialVariants);
      } catch (err: any) {
        setDirectSaleError(err.message || 'No se pudo cargar el catálogo de productos.');
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  const handleAddDirectItem = (product: Product) => {
    const variantId = selectedProductVariants[product.id] || product.variants[0]?.id;
    if (!variantId) return;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || !variant.isAvailable) return;

    setSellerCartItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          variantId,
          productId: product.id,
          productName: product.name,
          variantName: variant.name,
          price: variant.price,
          quantity: 1,
          imagePath: variant.imagePath ?? product.mainImagePath,
        },
      ];
    });
  };

  const handleUpdateDirectQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setSellerCartItems((prev) => prev.filter((i) => i.variantId !== variantId));
    } else {
      setSellerCartItems((prev) =>
        prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
      );
    }
  };

  const handleRemoveDirectItem = (variantId: string) => {
    setSellerCartItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const handleDirectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setDirectSaleError('El comprobante excede el límite permitido de 5 MB.');
      setDirectPaymentProofFile(null);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setDirectSaleError('Formato no permitido. Solo se aceptan JPEG, PNG o PDF.');
      setDirectPaymentProofFile(null);
      return;
    }

    setDirectSaleError(null);
    setDirectPaymentProofFile(file);
  };

  const handleCreateSellerSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellerCartItems.length === 0) return;

    if (!directCustomerName.trim() || !directCustomerPhone.trim()) {
      setDirectSaleError('Por favor ingresa el nombre y teléfono del cliente.');
      return;
    }

    if (!isValidGuatemalanPhone(directCustomerPhone)) {
      setDirectSaleError('Ingresa un número válido de Guatemala con 8 dígitos.');
      return;
    }

    if (directPaymentMethod === 'TRANSFER' && !directPaymentProofFile) {
      setDirectSaleError('Para pagos por transferencia es obligatorio adjuntar el comprobante.');
      return;
    }

    setIsSubmittingDirectSale(true);
    setDirectSaleError(null);

    try {
      const customerPhoneDigits = getGuatemalanPhoneDigits(directCustomerPhone);
      const orderPayloadItems = sellerCartItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));

      const idempotencyKey = `seller-sale-${user?.id?.slice(0, 8) ?? '0000'}-${Date.now()}`;

      let result: { id?: string; publicCode: string; total: string };

      if (directPaymentMethod === 'CASH') {
        result = await apiClient<{ id?: string; publicCode: string; total: string }>('orders', {
          method: 'POST',
          idempotencyKey,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: directCustomerName.trim(),
            customerPhone: customerPhoneDigits,
            paymentMethod: 'CASH',
            items: orderPayloadItems,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('customerName', directCustomerName.trim());
        formData.append('customerPhone', customerPhoneDigits);
        formData.append('paymentMethod', 'TRANSFER');
        formData.append('items', JSON.stringify(orderPayloadItems));
        if (directPaymentProofFile) {
          formData.append('paymentProof', directPaymentProofFile);
        }

        result = await apiClient<{ id?: string; publicCode: string; total: string }>('orders', {
          method: 'POST',
          idempotencyKey,
          body: formData,
        });
      }

      // Claim automatico para asignarle la venta a la vendedora
      const claimedOrder = await apiClient<SellerOrder>('seller/orders/claim', {
        method: 'POST',
        token: token!,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicCode: result.publicCode }),
      });

      // Si fue efectivo y la vendedora lo marco recibido, se marca en backend
      if (directPaymentMethod === 'CASH' && cashAlreadyReceived && claimedOrder.id) {
        await apiClient(`seller/orders/${claimedOrder.id}/cash-received`, {
          method: 'POST',
          token: token!,
        }).catch(() => undefined);
      }

      setCreatedSaleResult({
        publicCode: result.publicCode,
        total: result.total ?? calculateDirectTotal(sellerCartItems),
        customerName: directCustomerName.trim(),
      });
      setSellerCartItems([]);
      setDirectCustomerName('');
      setDirectCustomerPhone('');
      setDirectPaymentProofFile(null);
      await loadSellerData();
    } catch (err: any) {
      setDirectSaleError(err.message || 'Error al procesar la venta. Inténtalo de nuevo.');
    } finally {
      setIsSubmittingDirectSale(false);
    }
  };

  const handleSavePayoutSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isSavingPayoutSettings) return;
    setIsSavingPayoutSettings(true);
    setPayoutSettingsMessage(null);
    try {
      await apiClient<SellerPayoutSettings>('seller/commissions/payout-settings', {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
        }),
      });
      setSavedBankName(bankName.trim());
      setSavedBankAccountNumber(bankAccountNumber.trim());
      setIsEditingPayoutSettings(false);
      setPayoutSettingsMessage('Datos bancarios guardados correctamente.');
    } catch (error: unknown) {
      setPayoutSettingsMessage(
        error instanceof Error ? error.message : 'No se pudieron guardar los datos bancarios.',
      );
    } finally {
      setIsSavingPayoutSettings(false);
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

      {/* Banner / CTA: Registrar Venta Directa */}
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,45,155,0.35)] bg-gradient-to-r from-[#1A0B16] via-[#110910] to-[#0D0A0C] p-6 shadow-[0_0_30px_rgba(255,45,155,0.12)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sakura/30 bg-sakura/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sakura">
              <ShoppingBag className="h-3 w-3" aria-hidden="true" />
              <span>Venta Personal de Catálogo</span>
            </div>
            <h2 className="text-xl font-black text-white">¿Hiciste una venta directa a una clienta?</h2>
            <p className="text-xs leading-relaxed text-[#C2B6BC]">
              Registra los productos solicitados con selector de cantidad, ingresa los datos de contacto y el comprobante o pago en efectivo. La venta y su comisión se asignarán automáticamente a tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openDirectSaleModal()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sakura-700 hover:bg-sakura-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(255,45,155,0.3)] transition-all duration-200 active:scale-95 shrink-0"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Registrar Venta Directa</span>
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(255,45,155,0.2)] bg-[#0D0A0C] p-6 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-sakura/30 bg-sakura/10 p-2.5 text-sakura">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Cuenta para recibir comisiones</h2>
                {savedBankName && savedBankAccountNumber && !isEditingPayoutSettings && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Activa para transferencias
                  </span>
                )}
              </div>
              <p className="text-xs leading-5 text-[#A09098]">
                Esta cuenta se mostrará al administrador al registrar una transferencia de tus comisiones.
              </p>
            </div>
          </div>

          {savedBankName && savedBankAccountNumber && !isEditingPayoutSettings && (
            <button
              type="button"
              onClick={() => {
                setIsEditingPayoutSettings(true);
                setPayoutSettingsMessage(null);
              }}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-white/10 bg-[#131014] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:border-sakura/40 hover:bg-white/5 active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5 text-sakura" aria-hidden="true" />
              <span>Modificar cuenta</span>
            </button>
          )}
        </div>

        {/* Vista Profesional de la Cuenta Configurada */}
        {savedBankName && savedBankAccountNumber && !isEditingPayoutSettings ? (
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#140F13] to-[#0D0A0C] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A09098] block">
                Destino de transferencias registrado
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-base font-black text-white">{savedBankName}</span>
                <span className="font-mono text-sm text-[#C2B6BC] bg-[#080608] px-2.5 py-0.5 rounded-lg border border-white/5">
                  No. {savedBankAccountNumber}
                </span>
              </div>
              <p className="text-[11px] text-[#8E8088] flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Datos verificados • Solo visibles para ti y administración.</span>
              </p>
            </div>
            {payoutSettingsMessage && (
              <p role="status" aria-live="polite" className="text-xs text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                {payoutSettingsMessage}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSavePayoutSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="seller-bank-name" className="mb-1.5 block text-xs font-bold text-[#C2B6BC]">
                  Banco <span className="text-sakura">*</span>
                </label>
                <input
                  id="seller-bank-name"
                  type="text"
                  required
                  maxLength={120}
                  autoComplete="organization"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="Ej. Banrural, Banco Industrial, G&T Continental..."
                  className="w-full rounded-xl border border-white/10 bg-[#131014] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5C4E54] focus:border-sakura focus:outline-none focus:ring-1 focus:ring-sakura"
                />
              </div>
              <div>
                <label htmlFor="seller-bank-account" className="mb-1.5 block text-xs font-bold text-[#C2B6BC]">
                  Número de cuenta <span className="text-sakura">*</span>
                </label>
                <input
                  id="seller-bank-account"
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="off"
                  value={bankAccountNumber}
                  onChange={(event) => setBankAccountNumber(event.target.value)}
                  placeholder="Ingresa el número de cuenta monetaria o de ahorros"
                  className="w-full rounded-xl border border-white/10 bg-[#131014] px-3.5 py-2.5 font-mono text-sm text-white placeholder:font-sans placeholder:text-[#5C4E54] focus:border-sakura focus:outline-none focus:ring-1 focus:ring-sakura"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
              <p role="status" aria-live="polite" className="text-xs text-[#C2B6BC] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sakura shrink-0" aria-hidden="true" />
                <span>{payoutSettingsMessage ?? 'Tus datos bancarios solo están disponibles para ti y administración.'}</span>
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {savedBankName && savedBankAccountNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setBankName(savedBankName);
                      setBankAccountNumber(savedBankAccountNumber);
                      setIsEditingPayoutSettings(false);
                      setPayoutSettingsMessage(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#A09098] hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingPayoutSettings || !bankName.trim() || !bankAccountNumber.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sakura-700 px-5 text-xs font-bold text-white transition-colors hover:bg-sakura-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500 shadow-[0_0_15px_rgba(255,45,155,0.2)]"
                >
                  {isSavingPayoutSettings ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSavingPayoutSettings ? 'Guardando…' : 'Guardar cuenta'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Formulario de Reclamo de Pedido */}
      <div className="bg-gradient-to-r from-[#1A0B14] via-[#0D0A0C] to-[#120810] border border-[rgba(255,45,155,0.3)] rounded-2xl p-6 text-white shadow-[0_0_30px_rgba(255,45,155,0.15)] space-y-4">
        <div className="flex items-center space-x-2">
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

        <form onSubmit={handleClaimOrder} className="max-w-lg space-y-1.5">
          <label htmlFor="claim-code" className="block text-xs font-bold text-[#C2B6BC]">Código del pedido</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                id="claim-code"
                type="text"
                required
                aria-describedby="claim-code-help"
                placeholder="VNT-XXXXXX"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                className="w-full h-[42px] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#131014] text-white text-sm uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
              />
            </div>
            <button
              type="submit"
              disabled={isClaiming}
              className="h-[42px] px-6 rounded-xl bg-sakura-700 hover:bg-sakura-600 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(255,45,155,0.3)] flex items-center justify-center space-x-2 active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 shrink-0"
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
          </div>
          <p id="claim-code-help" className="text-[11px] text-[#A09098]">Formato: VNT- seguido de seis letras o números.</p>
        </form>
      </div>

      {/* Lista de Pedidos Asignados */}
      <div id="pedidos-asignados" className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.2)] p-6 space-y-4 shadow-sm">
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

                    <div className="bg-[#0D0A0C] rounded-lg p-2.5 text-[11px] text-[#A09098] space-y-2 border border-white/5">
                      <span className="font-semibold text-white block">Productos:</span>
                      {ord.items.map((it, idx) => {
                        const itemImage =
                          it.productVariant?.imagePath ?? it.productVariant?.product?.mainImagePath;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2.5 py-1 border-b border-white/[0.04] last:border-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(255,45,155,0.25)] bg-white/95 text-[10px] font-bold text-sakura">
                                {itemImage ? (
                                  <Image
                                    src={itemImage}
                                    alt={it.productNameSnapshot}
                                    fill
                                    sizes="40px"
                                    className="object-contain p-1"
                                  />
                                ) : (
                                  <span>
                                    {it.variantNameSnapshot
                                      ? it.variantNameSnapshot.slice(0, 2).toUpperCase()
                                      : 'SK'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 leading-tight">
                                <p className="text-white font-medium text-xs line-clamp-2">
                                  {it.quantity}x {it.productNameSnapshot}
                                </p>
                                <p className="text-[10px] text-[#8E8088] truncate">
                                  ({it.variantNameSnapshot})
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-white text-xs whitespace-nowrap ml-2">
                              Q{parseFloat(it.subtotal).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
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

      {/* Historial de pagos recibidos */}
      <div className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.2)] p-6 space-y-4 shadow-sm">
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-3">
          <h2 className="text-lg font-bold text-white">Historial de pagos recibidos</h2>
          <p className="text-xs text-[#A09098]">
            Registro de liquidaciones de comisiones realizadas por administración hacia tu cuenta.
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
            <p className="text-[#A09098] text-xs">Aún no se registran pagos de comisiones para tu cuenta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payouts.map((payout) => {
              const isTransfer = payout.method === 'TRANSFER';
              const isCancelled = payout.status === 'CANCELLED';

              return (
                <div
                  key={payout.id}
                  className="bg-[#131014] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        Q{payout.amount}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCancelled
                            ? 'bg-red-950 text-red-300 border border-red-500/30'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isCancelled ? 'CANCELADO' : 'LIQUIDADO'}
                      </span>
                    </div>

                    <div className="text-xs text-[#C2B6BC] space-y-1">
                      <p>
                        <span className="text-[#A09098]">Fecha:</span>{' '}
                        {new Date(payout.paidAt).toLocaleDateString('es-GT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p>
                        <span className="text-[#A09098]">Método:</span>{' '}
                        {isTransfer ? 'Transferencia' : 'Efectivo'}
                      </p>
                      {isTransfer && payout.bankNameSnapshot && (
                        <p className="text-[11px] text-[#A09098]">
                          Destino: {payout.bankNameSnapshot} ({payout.bankAccountNumberSnapshot})
                        </p>
                      )}
                      {isCancelled && payout.cancellationReason && (
                        <p className="text-[11px] text-red-300">
                          Motivo de cancelación: {payout.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <span className="text-[10px] text-[#8E8088]">
                      {payout.commissionsCount} pedidos incluidos
                    </span>
                    {payout.proofAvailable && (
                      <button
                        type="button"
                        onClick={() => void handleViewPayoutProof(payout)}
                        disabled={loadingProofPayoutId === payout.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1A151A] hover:bg-[#30272E] text-white border border-[rgba(255,45,155,0.3)] rounded-lg text-[11px] font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-sakura" />
                        <span>{loadingProofPayoutId === payout.id ? 'Cargando...' : 'Ver Comprobante'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Overlay: Registrar Venta Directa */}
      {isRegisteringSale && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-sale-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-5xl bg-[#0D0A0C] border border-[rgba(255,45,155,0.35)] rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(255,45,155,0.2)] flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6 bg-[#131014]/60">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-sakura/30 bg-sakura/10 p-2 text-sakura">
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="direct-sale-title" className="text-base sm:text-lg font-bold text-white">
                    Registrar Venta Directa
                  </h3>
                  <p className="text-xs text-[#A09098]">
                    Agrega productos del catálogo y registra los datos del cliente para asignar tu comisión.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRegisteringSale(false);
                  setCreatedSaleResult(null);
                  setDirectSaleError(null);
                }}
                className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Cerrar ventana de venta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {createdSaleResult ? (
                /* Pantalla de Confirmación de Venta Directa */
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white">¡Venta Registrada con Éxito!</h4>
                    <p className="text-xs text-[#A09098] mt-1">
                      El pedido ha sido creado y vinculado automáticamente a tus ventas y comisiones.
                    </p>
                  </div>

                  <div className="w-full bg-[#131014] border border-white/10 rounded-2xl p-4 text-left space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs text-[#A09098]">Código de pedido:</span>
                      <span className="font-mono font-bold text-sm bg-sakura/20 text-sakura border border-sakura/30 px-2 py-0.5 rounded-lg">
                        {createdSaleResult.publicCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs text-[#A09098]">Cliente:</span>
                      <span className="text-xs font-semibold text-white">{createdSaleResult.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A09098]">Total confirmado:</span>
                      <span className="text-sm font-black text-white">Q{parseFloat(createdSaleResult.total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedSaleResult(null);
                        setSellerCartItems([]);
                      }}
                      className="flex-1 h-11 rounded-xl border border-white/10 bg-[#131014] hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Registrar otra venta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringSale(false);
                        setCreatedSaleResult(null);
                        window.setTimeout(() => {
                          const el = document.getElementById('pedidos-asignados');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      className="flex-1 h-11 rounded-xl bg-sakura-700 hover:bg-sakura-600 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(255,45,155,0.3)]"
                    >
                      Ver mis ventas registradas
                    </button>
                  </div>
                </div>
              ) : (
                /* Layout de 2 columnas: Catálogo a la izquierda, Carrito y Formulario a la derecha */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Columna Izquierda: Buscador, Categorías y Catálogo */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Buscador de Catálogo */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                      <input
                        type="search"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Buscar por producto, tono o categoría..."
                        className="w-full h-11 pl-10 pr-9 rounded-xl border border-white/10 bg-[#131014] text-white text-sm placeholder:text-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
                      />
                      {catalogSearch && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Chips de Categorías */}
                    {catalogCategories.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCatalogCategory('')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                            selectedCatalogCategory === ''
                              ? 'bg-sakura text-white shadow-[0_0_12px_rgba(255,45,155,0.4)]'
                              : 'bg-[#131014] text-[#A09098] hover:text-white border border-white/5'
                          }`}
                        >
                          Todas ({catalogProducts.length})
                        </button>
                        {catalogCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCatalogCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                              selectedCatalogCategory === cat.id
                                ? 'bg-sakura text-white shadow-[0_0_12px_rgba(255,45,155,0.4)]'
                                : 'bg-[#131014] text-[#A09098] hover:text-white border border-white/5'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Lista de Productos */}
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {catalogLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="h-32 rounded-xl bg-[#131014] border border-white/5" />
                          ))}
                        </div>
                      ) : filteredCatalogProducts.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl space-y-2">
                          <Search className="w-6 h-6 mx-auto text-[#A09098]" />
                          <p className="text-sm text-[#A09098]">No se encontraron productos con ese filtro.</p>
                          {catalogSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setCatalogSearch('');
                                setSelectedCatalogCategory('');
                              }}
                              className="text-xs text-sakura font-bold hover:underline"
                            >
                              Limpiar filtros de búsqueda
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredCatalogProducts.map((prod) => {
                            const selectedVariantId = selectedProductVariants[prod.id] || prod.variants[0]?.id;
                            const currentVariant = prod.variants.find((v) => v.id === selectedVariantId) ?? prod.variants[0];
                            const variantImage = currentVariant?.imagePath ?? prod.mainImagePath;
                            const inCartItem = sellerCartItems.find((ci) => ci.variantId === selectedVariantId);
                            const inCartQty = inCartItem?.quantity ?? 0;
                            const isAvailable = currentVariant?.isAvailable ?? false;

                            return (
                              <div
                                key={prod.id}
                                className="bg-[#131014] border border-white/10 hover:border-sakura/30 rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition-all duration-200"
                              >
                                <div className="flex gap-3">
                                  <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-white/95 border border-[rgba(255,45,155,0.2)] flex items-center justify-center">
                                    {variantImage ? (
                                      <Image
                                        src={variantImage}
                                        alt={prod.name}
                                        fill
                                        sizes="56px"
                                        className="object-contain p-1"
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-sakura">
                                        {prod.name.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] uppercase font-bold text-sakura block truncate">
                                      {prod.category.name}
                                    </span>
                                    <h5 className="text-xs font-bold text-white line-clamp-1" title={prod.name}>
                                      {prod.name}
                                    </h5>
                                    <span className="text-xs font-black text-white block mt-0.5">
                                      {currentVariant ? `Q${parseFloat(currentVariant.price).toFixed(2)}` : 'N/D'}
                                    </span>
                                  </div>
                                </div>

                                {prod.variants.length > 1 && (
                                  <div>
                                    <select
                                      value={selectedVariantId}
                                      onChange={(e) =>
                                        setSelectedProductVariants((prev) => ({
                                          ...prev,
                                          [prod.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full text-[11px] bg-[#0D0A0C] border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-sakura"
                                    >
                                      {prod.variants.map((v) => (
                                        <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                                          {v.name} {!v.isAvailable ? '(Agotado)' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                                  {!isAvailable ? (
                                    <span className="text-[11px] text-gray-500 font-semibold">Agotado</span>
                                  ) : inCartQty > 0 ? (
                                    <div className="flex items-center gap-1.5 w-full justify-between">
                                      <span className="text-[10px] text-emerald-400 font-bold">En el pedido</span>
                                      <div className="flex items-center border border-white/10 rounded-lg bg-[#0D0A0C]">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateDirectQuantity(selectedVariantId, inCartQty - 1)}
                                          className="p-1 hover:text-sakura text-gray-400 active:scale-90 transition-transform"
                                          aria-label="Reducir cantidad"
                                        >
                                          <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="px-2 text-xs font-bold text-white motion-value-change">
                                          {inCartQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateDirectQuantity(selectedVariantId, inCartQty + 1)}
                                          className="p-1 hover:text-sakura text-gray-400 active:scale-90 transition-transform"
                                          aria-label="Aumentar cantidad"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddDirectItem(prod)}
                                      className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-sakura-700 hover:bg-sakura-600 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Agregar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Columna Derecha: Carrito, Datos del Cliente y Método de Pago */}
                  <div className="lg:col-span-5 bg-[#131014] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Productos Seleccionados</span>
                        <span className="text-xs bg-sakura/20 text-sakura font-mono px-2 py-0.5 rounded-full border border-sakura/30">
                          {sellerCartItems.reduce((acc, it) => acc + it.quantity, 0)}
                        </span>
                      </h4>
                      {sellerCartItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSellerCartItems([])}
                          className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    {/* Lista de Items en Carrito */}
                    {sellerCartItems.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-white/10 rounded-xl space-y-1.5">
                        <ShoppingBag className="w-6 h-6 mx-auto text-gray-500" />
                        <p className="text-xs text-[#A09098]">No has agregado productos al pedido.</p>
                        <p className="text-[11px] text-gray-500">Selecciona del catálogo para comenzar.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {sellerCartItems.map((item) => (
                          <div
                            key={item.variantId}
                            className="flex items-center justify-between gap-2.5 bg-[#0D0A0C] p-2.5 rounded-xl border border-white/5"
                          >
                            <div className="min-w-0 flex-1 leading-tight">
                              <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                              <p className="text-[10px] text-[#A09098] truncate">{item.variantName}</p>
                              <p className="text-xs font-mono font-bold text-sakura mt-0.5">
                                Q{(parseFloat(item.price) * item.quantity).toFixed(2)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-white/10 rounded-lg bg-[#131014]">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDirectQuantity(item.variantId, item.quantity - 1)}
                                  className="p-1 text-gray-400 hover:text-white active:scale-90"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-1.5 text-xs font-bold text-white motion-value-change">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDirectQuantity(item.variantId, item.quantity + 1)}
                                  className="p-1 text-gray-400 hover:text-white active:scale-90"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDirectItem(item.variantId)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                aria-label="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resumen Financiero y Comisión */}
                    {sellerCartItems.length > 0 && (
                      <div className="bg-[#0D0A0C] border border-sakura/20 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#A09098]">Total a cobrar:</span>
                          <span className="text-base font-black text-white">
                            Q{calculateDirectTotal(sellerCartItems)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                          <span className="text-sakura font-bold flex items-center gap-1">
                            Tu comisión estimada:
                          </span>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full motion-value-change">
                            +Q{calculateDirectCommission(sellerCartItems)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Formulario del Cliente y Pago */}
                    <form onSubmit={handleCreateSellerSale} className="space-y-3 pt-1">
                      <div>
                        <label htmlFor="direct-customer-name" className="block text-xs font-bold text-[#C2B6BC] mb-1">
                          Nombre del cliente <span className="text-sakura">*</span>
                        </label>
                        <input
                          id="direct-customer-name"
                          type="text"
                          required
                          value={directCustomerName}
                          onChange={(e) => setDirectCustomerName(e.target.value)}
                          placeholder="Nombre y apellido"
                          className="w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0D0A0C] text-sm text-white placeholder:text-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
                        />
                      </div>

                      <div>
                        <label htmlFor="direct-customer-phone" className="block text-xs font-bold text-[#C2B6BC] mb-1">
                          Teléfono (WhatsApp) <span className="text-sakura">*</span>
                        </label>
                        <input
                          id="direct-customer-phone"
                          type="tel"
                          required
                          maxLength={9}
                          value={directCustomerPhone}
                          onChange={(e) => setDirectCustomerPhone(formatGuatemalanPhone(e.target.value))}
                          placeholder="4123-4567"
                          className="w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0D0A0C] text-sm text-white font-mono placeholder:font-sans placeholder:text-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
                        />
                        <p className="text-[10px] text-[#A09098] mt-0.5">8 dígitos de Guatemala.</p>
                      </div>

                      {/* Selector de Método de Pago */}
                      <div>
                        <label className="block text-xs font-bold text-[#C2B6BC] mb-1.5">
                          Método de pago <span className="text-sakura">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDirectPaymentMethod('CASH')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              directPaymentMethod === 'CASH'
                                ? 'bg-sakura text-white shadow-[0_0_15px_rgba(255,45,155,0.3)]'
                                : 'bg-[#0D0A0C] text-[#A09098] border border-white/10 hover:text-white'
                            }`}
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Efectivo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDirectPaymentMethod('TRANSFER')}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              directPaymentMethod === 'TRANSFER'
                                ? 'bg-sakura text-white shadow-[0_0_15px_rgba(255,45,155,0.3)]'
                                : 'bg-[#0D0A0C] text-[#A09098] border border-white/10 hover:text-white'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Transferencia</span>
                          </button>
                        </div>
                      </div>

                      {/* Opciones según método de pago */}
                      {directPaymentMethod === 'CASH' ? (
                        <div className="bg-[#0D0A0C] border border-white/10 rounded-xl p-2.5">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cashAlreadyReceived}
                              onChange={(e) => setCashAlreadyReceived(e.target.checked)}
                              className="mt-0.5 rounded border-white/20 bg-[#131014] text-sakura focus:ring-sakura"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-white block">Ya recibí el dinero en efectivo</span>
                              <span className="text-[#8E8088]">
                                Se marcará recibido para validación administrativa.
                              </span>
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-1.5 bg-[#0D0A0C] border border-white/10 rounded-xl p-2.5">
                          <label htmlFor="direct-payment-proof" className="block text-[11px] font-bold text-[#C2B6BC]">
                            Comprobante de transferencia <span className="text-sakura">*</span>
                          </label>
                          <input
                            id="direct-payment-proof"
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={handleDirectFileChange}
                            className="block w-full text-[11px] text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                          />
                          {directPaymentProofFile && (
                            <p className="text-[10px] text-emerald-400">
                              Archivo: {directPaymentProofFile.name} ({(directPaymentProofFile.size / 1024).toFixed(0)} KB)
                            </p>
                          )}
                        </div>
                      )}

                      {/* Error Alert */}
                      {directSaleError && (
                        <div role="alert" className="bg-red-950/60 text-red-200 border border-red-500/40 p-2.5 rounded-xl text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>{directSaleError}</span>
                        </div>
                      )}

                      {/* Botón de Enviar */}
                      <button
                        type="submit"
                        disabled={
                          isSubmittingDirectSale ||
                          sellerCartItems.length === 0 ||
                          !directCustomerName.trim() ||
                          !directCustomerPhone.trim()
                        }
                        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-sakura-700 hover:bg-sakura-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,45,155,0.25)] active:scale-98"
                      >
                        {isSubmittingDirectSale ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                            <span>Procesando venta…</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>
                              Confirmar Venta {sellerCartItems.length > 0 ? `(Q${calculateDirectTotal(sellerCartItems)})` : ''}
                            </span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comprobante Privado */}
      {signedPayoutProofUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="bg-[#0D0A0C] rounded-2xl max-w-lg w-full p-5 space-y-4 border border-[rgba(255,45,155,0.3)] shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm">Comprobante de Pago</h3>
              <button
                type="button"
                onClick={() => setSignedPayoutProofUrl(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-[4/3] bg-[#080608] rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
              <img
                src={signedPayoutProofUrl}
                alt="Comprobante de pago"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSignedPayoutProofUrl(null)}
                className="px-4 py-1.5 bg-sakura-700 hover:bg-sakura-600 text-white font-bold rounded-xl text-xs"
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
