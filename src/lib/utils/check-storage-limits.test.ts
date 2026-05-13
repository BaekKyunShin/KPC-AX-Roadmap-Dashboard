import { describe, it, expect } from 'vitest';
import { checkStorageLimits, type BucketSnapshot, type ExpectedBucketLimit } from './check-storage-limits';

const EXPECTED: ExpectedBucketLimit[] = [
  { bucketId: 'notice-attachments', expectedBytes: 31457280 }, // 30MB
  { bucketId: 'interview-attachments', expectedBytes: 20971520 }, // 20MB
];

describe('checkStorageLimits', () => {
  it('모든 버킷 한도가 기대값과 일치하면 ok=true', () => {
    const snapshots: BucketSnapshot[] = [
      { id: 'notice-attachments', file_size_limit: 31457280 },
      { id: 'interview-attachments', file_size_limit: 20971520 },
    ];
    const result = checkStorageLimits(snapshots, EXPECTED);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it('일부 버킷 한도가 기대값보다 작으면 mismatch + ok=false', () => {
    const snapshots: BucketSnapshot[] = [
      { id: 'notice-attachments', file_size_limit: 20971520 }, // 20MB (기대 30MB)
      { id: 'interview-attachments', file_size_limit: 20971520 },
    ];
    const result = checkStorageLimits(snapshots, EXPECTED);
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toEqual({
      bucketId: 'notice-attachments',
      expected: 31457280,
      actual: 20971520,
    });
  });

  it('버킷이 운영에 존재하지 않으면 mismatch (actual=null)', () => {
    const snapshots: BucketSnapshot[] = [
      { id: 'notice-attachments', file_size_limit: 31457280 },
    ];
    const result = checkStorageLimits(snapshots, EXPECTED);
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]).toEqual({
      bucketId: 'interview-attachments',
      expected: 20971520,
      actual: null,
    });
  });

  it('file_size_limit가 null인 (제한 없음) 버킷은 mismatch (코드 가정과 불일치)', () => {
    const snapshots: BucketSnapshot[] = [
      { id: 'notice-attachments', file_size_limit: null },
      { id: 'interview-attachments', file_size_limit: 20971520 },
    ];
    const result = checkStorageLimits(snapshots, EXPECTED);
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]).toEqual({
      bucketId: 'notice-attachments',
      expected: 31457280,
      actual: null,
    });
  });

  it('기대 목록에 없는 추가 버킷은 무시 (다른 도메인 영역 영향 없음)', () => {
    const snapshots: BucketSnapshot[] = [
      { id: 'notice-attachments', file_size_limit: 31457280 },
      { id: 'interview-attachments', file_size_limit: 20971520 },
      { id: 'avatars', file_size_limit: 1048576 },
    ];
    const result = checkStorageLimits(snapshots, EXPECTED);
    expect(result.ok).toBe(true);
  });
});
