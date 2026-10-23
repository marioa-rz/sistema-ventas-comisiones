import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateCommissionPayoutDto, SellerCommissionFiltersDto } from './commissions.dto';

describe('commissions.dto', () => {
  it('validates a correct CreateCommissionPayoutDto', async () => {
    const dto = new CreateCommissionPayoutDto();
    dto.sellerId = '11111111-1111-4111-8111-111111111111';
    dto.commissionIds = ['22222222-2222-4222-8222-222222222222'];
    dto.idempotencyKey = 'payout-key-123';
    dto.reference = 'TR-998811';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects empty commissionIds or duplicate IDs', async () => {
    const dto = new CreateCommissionPayoutDto();
    dto.sellerId = '11111111-1111-4111-8111-111111111111';
    dto.commissionIds = [
      '22222222-2222-4222-8222-222222222222',
      '22222222-2222-4222-8222-222222222222', // duplicate
    ];
    dto.idempotencyKey = 'payout-key-123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'commissionIds')).toBe(true);
  });

  it('rejects invalid limit or offset in seller filters', async () => {
    const dto = new SellerCommissionFiltersDto();
    dto.limit = 0; // min 1
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
