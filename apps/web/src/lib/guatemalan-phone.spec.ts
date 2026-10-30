import { describe, expect, it } from 'vitest';

const phoneModule = await import('./guatemalan-phone').catch(() => ({}));
const formatGuatemalanPhone = (phoneModule as { formatGuatemalanPhone?: (value: string) => string }).formatGuatemalanPhone;
const getGuatemalanPhoneDigits = (phoneModule as { getGuatemalanPhoneDigits?: (value: string) => string }).getGuatemalanPhoneDigits;
const isValidGuatemalanPhone = (phoneModule as { isValidGuatemalanPhone?: (value: string) => boolean }).isValidGuatemalanPhone;

describe('Guatemalan phone input', () => {
  it('formats national numbers progressively as 2322-1231', () => {
    expect(formatGuatemalanPhone?.('23221231')).toBe('2322-1231');
    expect(formatGuatemalanPhone?.('23221')).toBe('2322-1');
  });

  it('normalizes pasted country code and separators to eight digits', () => {
    expect(formatGuatemalanPhone?.('+502 5555-0000')).toBe('5555-0000');
    expect(getGuatemalanPhoneDigits?.('+502 5555-0000')).toBe('55550000');
  });

  it.each(['2322-1231', '5555-0000', '7777-7777'])('accepts a valid Guatemalan contact number: %s', (phone) => {
    expect(isValidGuatemalanPhone?.(phone)).toBe(true);
  });

  it.each(['1234-5678', '8234-5678', '9234-5678', '2322-123', 'abcd-efgh'])('rejects an invalid Guatemalan contact number: %s', (phone) => {
    expect(isValidGuatemalanPhone?.(phone)).toBe(false);
  });
});
