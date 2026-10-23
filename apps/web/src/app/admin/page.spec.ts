import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('AdminDashboardPage API contract', () => {
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
});
