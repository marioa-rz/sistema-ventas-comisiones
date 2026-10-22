import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

describe('HealthController', () => {
  it('reports liveness without querying external dependencies', () => {
    const service = { checkDatabase: vi.fn() } as unknown as HealthService;
    const controller = new HealthController(service);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(service.checkDatabase).not.toHaveBeenCalled();
  });

  it('reports readiness after the database check succeeds', async () => {
    const service = { checkDatabase: vi.fn().mockResolvedValue(undefined) } as unknown as HealthService;
    const controller = new HealthController(service);

    await expect(controller.ready()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(service.checkDatabase).toHaveBeenCalledOnce();
  });
});
