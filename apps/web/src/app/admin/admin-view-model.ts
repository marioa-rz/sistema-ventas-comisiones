export interface ReviewableOrder {
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  seller: unknown | null;
  payment: {
    method: 'CASH' | 'TRANSFER';
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    cashReceivedAt: string | null;
    proofs: Array<{ reviewStatus: string }>;
  } | null;
}

export function paymentVerificationAvailability(order: ReviewableOrder) {
  if (order.status !== 'PENDING') return { canVerify: false, reason: 'El pedido ya fue procesado.' };
  if (!order.seller) return { canVerify: false, reason: 'Asigna una vendedora antes de confirmar.' };
  if (!order.payment || order.payment.status !== 'PENDING') {
    return { canVerify: false, reason: 'El pago no está pendiente de revisión.' };
  }
  if (order.payment.method === 'CASH' && !order.payment.cashReceivedAt) {
    return { canVerify: false, reason: 'La vendedora debe marcar el efectivo como recibido.' };
  }
  if (
    order.payment.method === 'TRANSFER' &&
    !order.payment.proofs.some((proof) => proof.reviewStatus === 'PENDING')
  ) {
    return { canVerify: false, reason: 'La transferencia necesita un comprobante pendiente.' };
  }
  return { canVerify: true, reason: null };
}

export function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function firstDayOfLocalMonth(date: Date) {
  return formatLocalDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function filterAdminOrders<
  T extends { publicCode: string; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' },
>(orders: T[], selectedStatus: 'PENDING' | 'CONFIRMED' | 'ALL', codeQuery: string) {
  const normalizedCode = codeQuery.trim().toUpperCase();
  return orders.filter((order) => {
    const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;
    const matchesCode = !normalizedCode || order.publicCode.toUpperCase().includes(normalizedCode);
    return matchesStatus && matchesCode;
  });
}
