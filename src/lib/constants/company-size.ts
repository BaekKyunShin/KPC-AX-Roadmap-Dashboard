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
