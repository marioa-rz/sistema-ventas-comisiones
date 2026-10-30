import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('SellerPortalPage failure states', () => {
  it('returns unauthenticated visitors directly to the canonical portal', () => {
    expect(source).toContain("router.replace('/portal')");
    expect(source).not.toContain("router.replace('/login')");
  });

  it('sends an authenticated administrator to their own panel', () => {
    expect(source).toContain("user.role === 'ADMIN'");
    expect(source).toContain("router.replace('/admin')");
  });

  it('shows data-loading failures instead of silently rendering empty data', () => {
    expect(source).toContain('setLoadError(');
    expect(source).toContain('{loadError && (');
    expect(source).not.toContain('// Manejado silenciosamente');
  });

  it('explains who closes a pending transfer sale', () => {
    expect(source).toContain('Pendiente de revisión administrativa');
  });

  it('labels the claim code and announces claim results', () => {
    expect(source).toContain('htmlFor="claim-code"');
    expect(source).toContain('id="claim-code"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
  });

  it('uses stable skeletons and progress indicators for asynchronous work', () => {
    expect(source).toContain('animate-pulse');
    expect(source).toContain('animate-spin');
  });

  it('keeps the claim heading free of decorative star icons', () => {
    expect(source).not.toContain('Sparkles');
    expect(source).toContain('Reclamar Pedido con Código');
  });

  it('lets the seller configure the destination for commission transfers', () => {
    expect(source).toContain("apiClient<SellerPayoutSettings>('seller/commissions/payout-settings'");
    expect(source).toContain("method: 'PATCH'");
    expect(source).toContain('htmlFor="seller-bank-name"');
    expect(source).toContain('id="seller-bank-name"');
    expect(source).toContain('htmlFor="seller-bank-account"');
    expect(source).toContain('id="seller-bank-account"');
    expect(source).toContain('Número de cuenta');
  });

  it('renders product thumbnail images for ordered items', () => {
    expect(source).toContain("import Image from 'next/image'");
    expect(source).toContain('it.productVariant?.imagePath');
    expect(source).toContain('<Image');
  });

  it('shows the authenticated seller payout history and private proofs', () => {
    expect(source).toContain("apiClient<SellerCommissionPayout[]>('seller/commissions/payouts'");
    expect(source).toContain('Historial de pagos recibidos');
    expect(source).toContain('seller/commissions/payouts/${payout.id}/proof-url');
    expect(source).toContain('payout.proofAvailable');
    expect(source).toContain('payout.status === \'CANCELLED\'');
  });

  it('allows the seller to register direct sales from the catalog with search and quantities', () => {
    expect(source).toContain('Registrar Venta Directa');
    expect(source).toContain('openDirectSaleModal');
    expect(source).toContain('catalogSearch');
    expect(source).toContain('filterAndSortProducts');
    expect(source).toContain('handleAddDirectItem');
    expect(source).toContain('handleUpdateDirectQuantity');
    expect(source).toContain('handleRemoveDirectItem');
    expect(source).toContain('motion-value-change');
  });

  it('validates and formats customer phone number for direct sales using Guatemalan standard', () => {
    expect(source).toContain('formatGuatemalanPhone(e.target.value)');
    expect(source).toContain('isValidGuatemalanPhone(directCustomerPhone)');
    expect(source).toContain('getGuatemalanPhoneDigits(directCustomerPhone)');
    expect(source).toContain('htmlFor="direct-customer-phone"');
    expect(source).toContain('id="direct-customer-phone"');
  });

  it('handles cash and transfer payment methods for direct sales', () => {
    expect(source).toContain("directPaymentMethod === 'CASH'");
    expect(source).toContain("directPaymentMethod === 'TRANSFER'");
    expect(source).toContain('handleDirectFileChange');
    expect(source).toContain('cashAlreadyReceived');
    expect(source).toContain('seller/orders/claim');
    expect(source).toContain('cash-received');
  });

  it('scrolls to assigned orders section when clicking to view registered sales', () => {
    expect(source).toContain('id="pedidos-asignados"');
    expect(source).toContain("getElementById('pedidos-asignados')");
    expect(source).toContain('scrollIntoView');
    expect(source).toContain('Ver mis ventas registradas');
  });
});
