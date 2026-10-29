import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('SellerPortalPage failure states', () => {
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
});
