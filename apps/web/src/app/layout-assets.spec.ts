import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nextConfig = readFileSync(new URL('../../next.config.mjs', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../../../../.gitignore', import.meta.url), 'utf8');

describe('Next.js build asset isolation', () => {
  it('keeps development assets separate from production builds', () => {
    expect(nextConfig).toContain("distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'");
    expect(gitignore).toContain('.next-dev/');
  });
});
