import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CancelOrderDto, ClaimOrderDto, ReviewPaymentDto } from './order-workflow.dto';

describe('order workflow DTOs', () => {
  it('normalizes and validates a public order code', async () => {
    const dto = plainToInstance(ClaimOrderDto, { publicCode: ' vnt-abc123 ' });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.publicCode).toBe('VNT-ABC123');
  });

  it('requires a reason when rejecting a payment', async () => {
    const dto = plainToInstance(ReviewPaymentDto, { decision: 'REJECTED' });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });

  it('requires a meaningful cancellation reason', async () => {
    const dto = plainToInstance(CancelOrderDto, { reason: '   ' });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
