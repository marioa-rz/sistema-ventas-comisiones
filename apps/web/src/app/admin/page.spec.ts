import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('AdminDashboardPage API contract', () => {
  it('returns unauthenticated visitors directly to the canonical portal', () => {
    expect(source).toContain("router.replace('/portal')");
    expect(source).not.toContain("router.replace('/login')");
  });

  it('sends an authenticated seller to their own portal', () => {
    expect(source).toContain("user.role === 'SELLER'");
    expect(source).toContain("router.replace('/seller')");
  });

  it('reads the nested sales contract returned by GET /admin/dashboard', () => {
    expect(source).toContain('dashboard.sales.today.totalAmount');
    expect(source).toContain('dashboard.sales.week.totalAmount');
    expect(source).toContain('dashboard.sales.month.totalAmount');
    expect(source).not.toContain('dashboard.salesToday');
  });

  it('uses the url property returned by the payment-proof endpoint', () => {
    expect(source).toContain('url: result.url');
    expect(source).not.toContain('result.signedUrl');
  });

  it('shows data-loading failures instead of silently rendering an empty dashboard', () => {
    expect(source).toContain('setLoadError(');
    expect(source).toContain('{loadError && (');
    expect(source).not.toContain('// Manejado silenciosamente');
  });

  it('requires an accessible confirmation dialog before financial decisions', () => {
    expect(source).not.toContain("prompt('Ingresa el motivo");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('Confirmar venta');
    expect(source).toContain('Rechazar pago');
    expect(source).toContain('trapPaymentDialogFocus');
    expect(source).toContain('decisionTriggerRef.current?.focus()');
    expect(source).toContain('disabled={processingPaymentId === pendingDecision.orderId}');
  });

  it('labels report dates and exposes the Excel loading state', () => {
    expect(source).toContain('htmlFor="report-start-date"');
    expect(source).toContain('htmlFor="report-end-date"');
    expect(source).toContain('disabled={isDownloadingReport}');
    expect(source).toContain("isDownloadingReport ? 'Descargando…' : 'Descargar Excel'");
  });

  it('registers commission payouts with a method and private transfer proof', () => {
    expect(source).toContain("useState<'CASH' | 'TRANSFER'>('TRANSFER')");
    expect(source).toContain('const [payoutProofFile, setPayoutProofFile]');
    expect(source).toContain("formData.append('method', payoutMethod)");
    expect(source).toContain("formData.append('proof', payoutProofFile)");
    expect(source).toContain('accept="image/jpeg,image/png"');
    expect(source).toContain('payoutTargetSeller.bankName');
    expect(source).toContain('payoutTargetSeller.bankAccountNumber');
    expect(source).not.toContain('No. Boleta / Referencia de Transferencia');
    expect(source).not.toContain('payoutReference');
  });

  it('shows payout history, private evidence and an accessible cancellation flow', () => {
    expect(source).toContain("apiClient<AdminCommissionPayout[]>('admin/commission-payouts?limit=100'");
    expect(source).toContain('Historial de pagos a vendedoras');
    expect(source).toContain('commission-payouts/${payout.id}/proof-url');
    expect(source).toContain('commission-payouts/${payoutToCancel.id}/cancel');
    expect(source).toContain("method: 'PATCH'");
    expect(source).toContain('htmlFor="payout-cancellation-reason"');
    expect(source).toContain('id="payout-cancellation-reason"');
  });

  it('correctly displays rejected payments and suppresses redundant verification actions', () => {
    expect(source).toContain("ord.payment?.status === 'REJECTED'");
    expect(source).toContain('COMPROBANTE RECHAZADO');
    expect(source).toContain('Comprobante Rechazado');
    expect(source).toContain("ord.payment?.status === 'PENDING'");
  });
});
