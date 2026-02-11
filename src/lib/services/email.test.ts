import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isThrottled, recordSend, clearThrottleMap } from './email';

describe('이메일 throttle 로직', () => {
  beforeEach(() => {
    clearThrottleMap();
  });

  it('첫 발송은 throttle되지 않아야 한다', () => {
    expect(isThrottled('sender1', 'recipient1')).toBe(false);
  });

  it('발송 기록 후 5분 이내에는 throttle되어야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender1', 'recipient1')).toBe(true);
  });

  it('다른 수신자에 대해서는 throttle되지 않아야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender1', 'recipient2')).toBe(false);
  });

  it('다른 발신자에 대해서는 throttle되지 않아야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender2', 'recipient1')).toBe(false);
  });

  it('5분이 지나면 throttle이 해제되어야 한다', () => {
    vi.useFakeTimers();
    try {
      recordSend('sender1', 'recipient1');
      expect(isThrottled('sender1', 'recipient1')).toBe(true);

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(isThrottled('sender1', 'recipient1')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clearThrottleMap 호출 후 모든 throttle이 해제되어야 한다', () => {
    recordSend('sender1', 'recipient1');
    recordSend('sender2', 'recipient2');
    clearThrottleMap();
    expect(isThrottled('sender1', 'recipient1')).toBe(false);
    expect(isThrottled('sender2', 'recipient2')).toBe(false);
  });
});
