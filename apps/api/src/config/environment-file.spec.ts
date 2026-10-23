import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadRootEnvironment } from './environment-file';

describe('loadRootEnvironment', () => {
  let temporaryRoot: string | undefined;

  afterEach(() => {
    if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('loads the repository root .env when the API runs from its workspace', () => {
    temporaryRoot = mkdtempSync(join(tmpdir(), 'sakura-env-'));
    const configDirectory = join(temporaryRoot, 'apps/api/src/config');
    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(join(temporaryRoot, '.env'), 'DATABASE_URL=postgresql://root-env\n');
    const isolatedEnvironment: Record<string, string> = {};

    loadRootEnvironment(configDirectory, isolatedEnvironment);

    expect(isolatedEnvironment.DATABASE_URL).toBe('postgresql://root-env');
  });
});
