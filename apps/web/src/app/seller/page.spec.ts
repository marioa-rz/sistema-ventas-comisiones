import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('SellerPortalPage failure states', () => {
  it('shows data-loading failures instead of silently rendering empty data', () => {
    expect(source).toContain('setLoadError(');
    expect(source).toContain('{loadError && (');
    expect(source).not.toContain('// Manejado silenciosamente');
  });
});
