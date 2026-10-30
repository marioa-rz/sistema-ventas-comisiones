import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CancelCommissionPayoutDto, CreateCommissionPayoutDto, SellerCommissionFiltersDto } from './commissions.dto';

describe('commissions.dto', () => {
  it('validates a correct CreateCommissionPayoutDto', async () => {
    const dto = new CreateCommissionPayoutDto();
    dto.sellerId = '11111111-1111-4111-8111-111111111111';
    dto.commissionIds = ['22222222-2222-4222-8222-222222222222'];
    dto.idempotencyKey = 'payout-key-123';
    dto.reference = 'TR-998811';
    dto.method = 'TRANSFER';

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

  it('requires an explicit supported payout method', async () => {
    const dto = new CreateCommissionPayoutDto();
    dto.sellerId = '11111111-1111-4111-8111-111111111111';
    dto.commissionIds = ['22222222-2222-4222-8222-222222222222'];
    dto.idempotencyKey = 'payout-key-123';

    const missingMethodErrors = await validate(dto);
    expect(missingMethodErrors.some((error) => error.property === 'method')).toBe(true);

    (dto as unknown as { method: string }).method = 'CARD';
    const unsupportedMethodErrors = await validate(dto);
    expect(unsupportedMethodErrors.some((error) => error.property === 'method')).toBe(true);
  });

  it('rejects invalid limit or offset in seller filters', async () => {
    const dto = new SellerCommissionFiltersDto();
    dto.limit = 0; // min 1
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('requires a meaningful reason to cancel a payout', async () => {
    const dto = new CancelCommissionPayoutDto();
    dto.reason = '   ';
    await expect(validate(dto)).resolves.not.toEqual([]);

    dto.reason = 'Comprobante cargado para la cuenta equivocada';
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
