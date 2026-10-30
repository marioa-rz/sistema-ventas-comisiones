const GUATEMALAN_PHONE_PATTERN = /^[2-7]\d{7}$/;

export function getGuatemalanPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.length > 8 && digits.startsWith('502')) {
    digits = digits.slice(3);
  }

  return digits.slice(0, 8);
}

export function formatGuatemalanPhone(value: string): string {
  const digits = getGuatemalanPhoneDigits(value);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function isValidGuatemalanPhone(value: string): boolean {
  return GUATEMALAN_PHONE_PATTERN.test(getGuatemalanPhoneDigits(value));
}
