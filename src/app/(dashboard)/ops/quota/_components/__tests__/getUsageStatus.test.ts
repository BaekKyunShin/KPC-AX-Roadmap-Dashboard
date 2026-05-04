import { describe, it, expect } from 'vitest';
import { getUsageStatus } from '../QuotaClient';

describe('getUsageStatus (#4)', () => {
  it('90% 이상은 "경고" + 빨강 + 즉시 조정 액션', () => {
    const s = getUsageStatus(90);
    expect(s.label).toBe('경고');
    expect(s.color).toMatch(/red/);
    expect(s.progressColor).toMatch(/red/);
    expect(s.action).toMatch(/즉시/);
  });

  it('100% 도 "경고"', () => {
    expect(getUsageStatus(100).label).toBe('경고');
  });

  it('70% 이상 90% 미만은 "주의" + 노랑 + 점검 권장', () => {
    expect(getUsageStatus(70).label).toBe('주의');
    expect(getUsageStatus(89).label).toBe('주의');
    expect(getUsageStatus(70).color).toMatch(/yellow/);
    expect(getUsageStatus(89).progressColor).toMatch(/yellow/);
    expect(getUsageStatus(70).action).toMatch(/점검|소통/);
  });

  it('70% 미만은 "정상" + 초록 + 모니터링', () => {
    expect(getUsageStatus(0).label).toBe('정상');
    expect(getUsageStatus(69).label).toBe('정상');
    expect(getUsageStatus(0).color).toMatch(/green/);
    expect(getUsageStatus(69).progressColor).toMatch(/green/);
    expect(getUsageStatus(0).action).toMatch(/모니터링/);
  });
});
