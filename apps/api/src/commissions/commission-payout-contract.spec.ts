import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
const dto = readFileSync(resolve(__dirname, 'commissions.dto.ts'), 'utf8');
const adminController = readFileSync(resolve(__dirname, 'admin-commissions.controller.ts'), 'utf8');
const sellerController = readFileSync(resolve(__dirname, 'seller-commissions.controller.ts'), 'utf8');
const service = readFileSync(resolve(__dirname, 'commissions.service.ts'), 'utf8');

describe('commission payout evidence contract', () => {
  it('persists seller payout settings and immutable payout evidence', () => {
    expect(schema).toContain('enum CommissionPayoutMethod');
    expect(schema).toContain('bankName          String?');
    expect(schema).toContain('bankAccountNumber String?');
    expect(schema).toContain('method                    CommissionPayoutMethod');
    expect(schema).toContain('bankNameSnapshot          String?');
    expect(schema).toContain('bankAccountNumberSnapshot String?');
    expect(schema).toContain('proofStoragePath          String?');
    expect(schema).toContain('proofOriginalFilename     String?');
    expect(schema).toContain('proofMimeType             String?');
    expect(schema).toContain('proofSizeBytes            Int?');
  });

  it('accepts a multipart proof for transfers and exposes a signed-url endpoint', () => {
    expect(dto).toContain('method!: CommissionPayoutMethod;');
    expect(adminController).toContain("@ApiConsumes('multipart/form-data')");
    expect(adminController).toContain("FileInterceptor('proof'");
    expect(adminController).toContain('@UploadedFile() proof?: PaymentProofFile');
    expect(adminController).toContain('createPayout(admin.id, dto, proof)');
    expect(adminController).toContain("@Get('commission-payouts/:id/proof-url')");
  });

  it('allows only the authenticated seller to manage their payout destination', () => {
    expect(dto).toContain('export class UpdateSellerPayoutSettingsDto');
    expect(sellerController).toContain("@Get('payout-settings')");
    expect(sellerController).toContain("@Patch('payout-settings')");
    expect(service).toContain('getSellerPayoutSettings(sellerId: string)');
    expect(service).toContain('updateSellerPayoutSettings(sellerId: string');
  });

  it('reuses private storage under a payout-specific path', () => {
    expect(service).toContain("this.proofStorage.upload(proof, 'commission-payouts/pending')");
    expect(service).toContain('Payout proof is required for transfers');
    expect(service).toContain('Payout proof is only accepted for transfers');
  });

  it('preserves payout history and supports audited cancellation', () => {
    expect(schema).toContain('enum CommissionPayoutStatus');
    expect(schema).toContain('model CommissionPayoutItem');
    expect(schema).toContain('status                    CommissionPayoutStatus');
    expect(schema).toContain('cancelledAt               DateTime?');
    expect(schema).toContain('cancellationReason        String?');
    expect(dto).toContain('export class CancelCommissionPayoutDto');
    expect(adminController).toContain("@Patch('commission-payouts/:id/cancel')");
    expect(adminController).toContain('cancelPayout(admin.id, id, dto)');
    expect(service).toContain('COMMISSION_PAYOUT_CANCELLED');
  });

  it('exposes seller-owned payout history and proof access', () => {
    expect(sellerController).toContain("@Get('payouts')");
    expect(sellerController).toContain("@Get('payouts/:id/proof-url')");
    expect(service).toContain('listSellerPayouts(sellerId: string');
    expect(service).toContain('getSellerPayoutProofUrl(sellerId: string, payoutId: string)');
  });
});
