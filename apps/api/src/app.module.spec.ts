import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

describe('AppModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves the complete dependency graph', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/test');
    vi.stubEnv('SUPABASE_JWT_ISSUER', 'https://project.supabase.co/auth/v1');
    vi.stubEnv('SUPABASE_JWT_AUDIENCE', 'authenticated');
    vi.stubEnv(
      'SUPABASE_JWKS_URL',
      'https://project.supabase.co/auth/v1/.well-known/jwks.json',
    );

    const moduleRef = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: vi.fn() });

    await expect(moduleRef.compile()).resolves.toBeDefined();
  });
});
