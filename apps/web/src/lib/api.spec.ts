import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from './api';
import * as apiModule from './api';

const apiDownload = (apiModule as typeof apiModule & {
  apiDownload?: (endpoint: string, token: string) => Promise<Blob>;
}).apiDownload;

describe('apiClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns JSON from a successful API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ value: 42 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiClient<{ value: number }>('health')).resolves.toEqual({ value: 42 });
  });

  it('preserves the backend validation message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ['customerName should not be empty'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiClient('orders')).rejects.toMatchObject({
      constructor: ApiError,
      statusCode: 400,
      message: 'customerName should not be empty',
    });
  });

  it('normalizes browser-specific network TypeErrors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')));

    await expect(apiClient('products')).rejects.toMatchObject({
      constructor: ApiError,
      statusCode: 0,
    });
  });
});

describe('apiDownload', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects an API error instead of downloading it as a report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Date range is invalid' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    expect(apiDownload).toBeTypeOf('function');
    await expect(apiDownload!('admin/reports/sales', 'token')).rejects.toMatchObject({
      constructor: ApiError,
      statusCode: 400,
      message: 'Date range is invalid',
    });
  });
});
