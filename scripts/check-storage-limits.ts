/**
 * 운영 Storage 버킷 file_size_limit ↔ 코드 상수 동기화 검증 CLI.
 *
 * 사용:
 *   npm run check:storage-limits
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL     필수
 *   SUPABASE_SERVICE_ROLE_KEY    필수 (admin 권한으로 storage.listBuckets 호출)
 *
 * 종료 코드:
 *   0  모든 버킷 한도가 기대값과 일치
 *   1  하나 이상의 버킷이 기대값과 불일치 (운영 변경 누락 등)
 *   2  환경변수 누락 등 실행 자체 실패
 *
 * 배경: 마이그 072 의 file_size_limit 30MB 상향이 운영 DB 에 한때 누락된
 *       채로 21MB 첨부 결함이 발생했음. 이 스크립트는 동일 누락이 다시
 *       발생할 경우 즉시 감지하기 위함.
 */
import { createClient } from '@supabase/supabase-js';
import {
  checkStorageLimits,
  type BucketSnapshot,
  type ExpectedBucketLimit,
} from '../src/lib/utils/check-storage-limits';
import { MAX_ATTACHMENT_BYTES } from '../src/lib/schemas/notice';

const EXPECTED: ExpectedBucketLimit[] = [
  { bucketId: 'notice-attachments', expectedBytes: MAX_ATTACHMENT_BYTES },
  // interview-attachments 는 마이그 065 에서 20MB 로 설계됨 (변경 예정 없음)
  { bucketId: 'interview-attachments', expectedBytes: 20 * 1024 * 1024 },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      '[check-storage-limits] 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(2);
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.storage.listBuckets();
  if (error) {
    console.error('[check-storage-limits] listBuckets 실패:', error.message);
    process.exit(2);
  }

  const snapshots: BucketSnapshot[] = (data ?? []).map((b) => ({
    id: b.id,
    file_size_limit: b.file_size_limit ?? null,
  }));

  const result = checkStorageLimits(snapshots, EXPECTED);

  if (result.ok) {
    console.log(
      `[check-storage-limits] OK — ${EXPECTED.length}개 버킷 한도 일치:`,
      EXPECTED.map((e) => `${e.bucketId}=${e.expectedBytes}`).join(', '),
    );
    process.exit(0);
  }

  console.error('[check-storage-limits] FAIL — 버킷 한도 불일치 발견:');
  for (const m of result.mismatches) {
    console.error(
      `  - ${m.bucketId}: expected=${m.expected}, actual=${m.actual ?? '(없음/null)'}`,
    );
  }
  console.error(
    '\n조치: 마이그레이션을 운영 DB 에 재적용하거나, 코드 상수를 운영 한도와 맞춰 갱신하세요.',
  );
  process.exit(1);
}

main().catch((e) => {
  console.error('[check-storage-limits] 예외:', e);
  process.exit(2);
});
