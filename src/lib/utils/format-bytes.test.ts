import { describe, it, expect } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('1KB 미만은 B 단위', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('1MB 미만은 KB 단위 (소수 1자리)', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('1MB 이상은 MB 단위 (소수 1자리)', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('100MB 상한 표기 — 첨부 진행률 표시에 사용', () => {
    expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB');
    expect(formatBytes(42 * 1024 * 1024)).toBe('42.0 MB');
  });
});
