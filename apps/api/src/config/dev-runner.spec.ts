import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('development runner', () => {
  it('uses a TypeScript runner that preserves Nest decorator metadata', () => {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const tsconfig = JSON.parse(readFileSync(resolve(__dirname, '../../tsconfig.json'), 'utf8')) as {
      'ts-node'?: { experimentalResolver?: boolean };
    };

    expect(packageJson.scripts['start:dev']).toContain('ts-node/register');
    expect(packageJson.scripts['start:dev']).not.toContain('tsx watch');
    expect(tsconfig['ts-node']?.experimentalResolver).toBe(true);
  });
});
