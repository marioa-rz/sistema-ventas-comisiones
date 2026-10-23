import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./auth-context.tsx', import.meta.url), 'utf8');

describe('AuthProvider session synchronization', () => {
  it('does not swallow a rejected commercial profile lookup', () => {
    expect(source).toContain("const profile = await apiClient<CommercialUser>('auth/me'");
    expect(source).toContain('throw error;');
    expect(source).not.toContain('// Manejado silenciosamente');
  });

  it('keeps the Supabase auth callback synchronous', () => {
    expect(source).toContain('onAuthStateChange((_event, session) =>');
    expect(source).not.toContain('onAuthStateChange(async');
  });
});
