/**
 * 바이트 → 사람이 읽는 크기 문자열.
 * 첨부 목록·업로드 진행률 표시가 같은 표기를 쓰도록 단일 출처로 둔다.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
