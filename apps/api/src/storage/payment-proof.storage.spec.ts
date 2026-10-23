import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentProofStorage } from './payment-proof.storage';

const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const file = {
  buffer: pngBuffer,
  mimetype: 'image/png',
  originalname: 'comprobante.png',
  size: pngBuffer.length,
};

describe('PaymentProofStorage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uploads an allowed proof to a non-predictable private path', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJlegacy-service-role');
    vi.stubEnv('SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET', 'payment-proofs');
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', request);

    const result = await new PaymentProofStorage().upload(file);

    expect(result).toMatchObject({
      originalFilename: 'comprobante.png',
      mimeType: 'image/png',
      sizeBytes: pngBuffer.length,
    });
    expect(result.path).toMatch(/^orders\/pending\/[0-9a-f-]{36}\.png$/);
    expect(request).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/payment-proofs\/orders\/pending\//,
      ),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer eyJlegacy-service-role', 'Content-Type': 'image/png' }),
        body: file.buffer,
      }),
    );
  });

  it('fails closed when a publishable or malformed key is configured as the backend secret', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_publishable_public');
    vi.stubEnv('SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET', 'payment-proofs');
    const request = vi.fn();
    vi.stubGlobal('fetch', request);

    await expect(new PaymentProofStorage().upload(file)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(request).not.toHaveBeenCalled();
  });

  it('uses a modern Supabase secret key only in the apikey header', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_backend');
    vi.stubEnv('SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET', 'payment-proofs');
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', request);

    await new PaymentProofStorage().upload(file);

    const options = request.mock.calls[0]?.[1] as RequestInit;
    expect(options.headers).toMatchObject({ apikey: 'sb_secret_backend' });
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  it.each([
    [{ ...file, mimetype: 'text/html' }, 'Only JPEG, PNG, or PDF payment proofs are allowed'],
    [{ ...file, size: 5 * 1024 * 1024 + 1 }, 'Payment proof exceeds the 5 MiB limit'],
    [
      { ...file, buffer: Buffer.from('<script>alert(1)</script>'), size: 25 },
      'Payment proof content does not match its declared MIME type',
    ],
    [{ ...file, originalname: `${'a'.repeat(252)}.png` }, 'Payment proof filename is too long'],
  ])('rejects unsafe files before upload', async (unsafeFile, message) => {
    await expect(new PaymentProofStorage().upload(unsafeFile)).rejects.toMatchObject({
      constructor: BadRequestException,
      message,
    });
  });

  it('deletes the exact uploaded object through the documented single-object endpoint', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJlegacy-service-role');
    vi.stubEnv('SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET', 'payment-proofs');
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', request);

    await new PaymentProofStorage().remove('orders/pending/proof.png');

    expect(request).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/payment-proofs/orders/pending/proof.png',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('creates a short-lived signed URL for a private proof', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_backend');
    vi.stubEnv('SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET', 'payment-proofs');
    const request = vi.fn().mockResolvedValue(
      new Response('{"signedURL":"/object/sign/payment-proofs/orders/pending/proof.pdf?token=signed"}', {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', request);

    await expect(new PaymentProofStorage().createSignedUrl('orders/pending/proof.pdf')).resolves.toEqual({
      url: 'https://project.supabase.co/storage/v1/object/sign/payment-proofs/orders/pending/proof.pdf?token=signed',
      expiresIn: 300,
    });
    expect(request).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/sign/payment-proofs/orders/pending/proof.pdf',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ expiresIn: 300 }) }),
    );
  });
});
