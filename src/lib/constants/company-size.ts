/**
 * 기업 규모 분류 상수
 * 한국 중소기업기본법, 소상공인보호법, 중견기업 성장촉진법 기준
 */

// 기업 규모 값 (데이터베이스 저장용)
export const COMPANY_SIZE_VALUES = ['1-9', '10-49', '50-299', '300-999', '1000+'] as const;

export type CompanySizeValue = (typeof COMPANY_SIZE_VALUES)[number];

// 기업 규모 레이블 (UI 표시용)
export const COMPANY_SIZE_LABELS: Record<CompanySizeValue, string> = {
  '1-9': '10명 미만 (소상공인)',
  '10-49': '10~49명 (소기업)',
  '50-299': '50~299명 (중소기업)',
  '300-999': '300~999명 (중견기업)',
  '1000+': '1,000명 이상 (대기업)',
} as const;

// Select 컴포넌트용 옵션 배열
export const COMPANY_SIZE_OPTIONS = COMPANY_SIZE_VALUES.map((value) => ({
  value,
  label: COMPANY_SIZE_LABELS[value],
}));

/**
 * 기업 규모 라벨에서 괄호 안 분류만 추출 — 표·카드의 "규모" 열 같이 짧은 표기가 필요한 곳에서 사용.
 *
 * 예: "10명 미만 (소상공인)" -> "소상공인", "1,000명 이상 (대기업)" -> "대기업"
 *
 * 이전 구현은 "인원수+명" 만 제거하는 정규식을 사용해 "10명 미만 (소상공인)" -> "미만 소상공인",
 * "1,000명 이상 (대기업)" -> "이상 대기업" 같이 "미만"/"이상" 단어가 남는 버그가 있었음.
 * 본 헬퍼는 모든 라벨이 "(분류)" 형태를 갖는 점을 활용해 안전하게 추출한다.
 *
 * 라벨 형식이 깨지면 원본을 그대로 반환 (방어).
 */
export function formatCompanySizeShort(size: string): string {
  const full = COMPANY_SIZE_LABELS[size as CompanySizeValue];
  if (!full) return size;
  const match = full.match(/\((.+)\)/);
  return match ? match[1] : full;
}
