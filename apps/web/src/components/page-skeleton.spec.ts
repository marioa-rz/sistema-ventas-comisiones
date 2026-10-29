import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page-skeleton.tsx', import.meta.url), 'utf8');

describe('PageSkeleton', () => {
  it('reserves the content layout and announces loading without motion-only feedback', () => {
    expect(source).toContain('aria-label={label}');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('animate-pulse');
    expect(source).toContain('min-h-[520px]');
  });
});
