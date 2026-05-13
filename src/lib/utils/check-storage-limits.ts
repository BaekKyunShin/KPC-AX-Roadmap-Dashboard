/**
 * Storage 버킷 file_size_limit 와 코드 상수 동기화 검증 헬퍼.
 *
 * 배경: 마이그 072(file_size_limit 20→30MB)가 운영 DB에 한때 미적용 상태로
 *       21MB 첨부가 Supabase Storage 413 으로 차단되는 결함이 발생함.
 *       코드 상수(`MAX_ATTACHMENT_BYTES`)와 운영 버킷 한도가 어긋나면
 *       사용자가 결함으로 보고할 때까지 알 수 없으므로, npm script
 *       (`check:storage-limits`) 로 즉시 감지할 수 있도록 한다.
 *
 * 본 모듈은 순수 함수만 export 하여 단위 테스트가 가능하다. 실제 buckets
 * 조회는 CLI 래퍼(`scripts/check-storage-limits.ts`) 가 수행한다.
 */

export interface ExpectedBucketLimit {
  bucketId: string;
  expectedBytes: number;
}

export interface BucketSnapshot {
  id: string;
  file_size_limit: number | null;
}

export interface BucketMismatch {
  bucketId: string;
  expected: number;
  actual: number | null;
}

export interface CheckResult {
  ok: boolean;
  mismatches: BucketMismatch[];
}

export function checkStorageLimits(
  snapshots: BucketSnapshot[],
  expected: ExpectedBucketLimit[],
): CheckResult {
  const snapshotsByid = new Map(snapshots.map((s) => [s.id, s]));
  const mismatches: BucketMismatch[] = [];

  for (const { bucketId, expectedBytes } of expected) {
    const snap = snapshotsByid.get(bucketId);
    const actual = snap?.file_size_limit ?? null;
    if (actual !== expectedBytes) {
      mismatches.push({ bucketId, expected: expectedBytes, actual });
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}
