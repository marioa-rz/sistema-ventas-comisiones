import { describe, expect, it } from 'vitest';
import { SessionRequestGuard } from './session-request-guard';

describe('SessionRequestGuard', () => {
  it('rejects a profile response from before logout', () => {
    const guard = new SessionRequestGuard();
    guard.activate('old-token');
    guard.clear();
    expect(guard.isCurrent('old-token')).toBe(false);
    expect(guard.hasActiveSession()).toBe(false);
  });

  it('rejects a response for a session replaced by another login', () => {
    const guard = new SessionRequestGuard();
    guard.activate('old-token');
    guard.activate('new-token');
    expect(guard.isCurrent('old-token')).toBe(false);
    expect(guard.isCurrent('new-token')).toBe(true);
    expect(guard.hasActiveSession()).toBe(true);
  });
});
