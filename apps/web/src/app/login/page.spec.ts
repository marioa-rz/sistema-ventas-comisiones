import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('legacy login route', () => {
  it('has no duplicate form and redirects to the canonical portal', () => {
    expect(source).toContain("redirect('/portal')");
    expect(source).not.toContain('signInWithPassword');
    expect(source).not.toContain('<form');
  });
});
