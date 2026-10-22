import { describe, expect, it } from 'vitest';
import { extractBearerToken } from './bearer-token';

describe('extractBearerToken', () => {
  it('extracts one Bearer token', () => {
    expect(extractBearerToken('Bearer header.payload.signature')).toBe('header.payload.signature');
  });

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer one two'])('rejects malformed authorization %s', (value) => {
    expect(() => extractBearerToken(value)).toThrow('Missing or malformed bearer token');
  });
});
