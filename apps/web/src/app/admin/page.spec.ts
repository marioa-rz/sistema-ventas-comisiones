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

  it('labels report dates and exposes the CSV loading state', () => {
    expect(source).toContain('htmlFor="report-start-date"');
    expect(source).toContain('htmlFor="report-end-date"');
    expect(source).toContain('disabled={isDownloadingReport}');
    expect(source).toContain("isDownloadingReport ? 'Descargando…' : 'Descargar CSV'");
  });
});
