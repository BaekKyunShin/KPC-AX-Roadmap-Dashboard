/**
 * XLSX 포맷 헬퍼
 * 순수 함수: 상태/날짜/레벨/시간/리스트 포맷팅 + 행 높이 계산
 */

import type { TrainingLevel, RoadmapCourseSpec } from '../../roadmap/roadmap-types';

// ============================================================================
// 포맷 헬퍼
// ============================================================================

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return '초안';
    case 'FINAL':
      return '확정본';
    case 'ARCHIVED':
      return '보관본';
    default:
      return status;
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 훈련 수준 한글 라벨 */
export function getLevelLabel(level: TrainingLevel | string): string {
  switch (level) {
    case 'BEGINNER':
      return '초급';
    case 'INTERMEDIATE':
      return '중급';
    case 'ADVANCED':
      return '고급';
    default:
      return String(level ?? '-');
  }
}

/** 시간 N을 "N시간" 문자열로 포맷 (0 이하는 "-") */
export function formatHours(hours: number): string {
  return hours > 0 ? `${hours}시간` : '-';
}

/** 문자열 배열을 불릿 라인으로 합침 */
export function formatBulletLines(items: string[] | undefined): string {
  if (!items || items.length === 0) return '-';
  return items.map(v => `• ${v}`).join('\n');
}

/** NCS 활용 여부 포맷 */
export function formatNcsUsed(used: boolean): string {
  return used ? 'O' : 'X';
}

/** 훈련과정 명세서의 총 교육시간 합계 */
export function sumSubjectHours(spec: RoadmapCourseSpec | undefined): number {
  if (!spec?.subjects) return 0;
  return spec.subjects.reduce((sum, s) => sum + (s.hours ?? 0), 0);
}

/**
 * 셀 너비를 고려한 행 높이 계산.
 * wrapText 활성화 시 한글 폭(영문 대비 ~1.8배)을 반영하여
 * 자동 줄바꿈이 발생했을 때의 실제 높이를 추정한다.
 */
export function calcRowHeight(
  text: string,
  colWidthWch: number,
  baseHeight = 22,
  lineHeight = 14.5,
): number {
  if (!text) return baseHeight;

  const charsPerLine = Math.max(colWidthWch / 1.8, 4);

  let totalLines = 0;
  for (const line of text.split('\n')) {
    if (line.length === 0) {
      totalLines += 0.6;
    } else {
      let weightedLen = 0;
      for (const ch of line) {
        weightedLen += ch.charCodeAt(0) > 127 ? 1.8 : 1;
      }
      totalLines += Math.max(1, Math.ceil(weightedLen / charsPerLine));
    }
  }

  return Math.max(baseHeight, Math.ceil(totalLines * lineHeight));
}
