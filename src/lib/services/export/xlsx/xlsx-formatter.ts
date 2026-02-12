/**
 * XLSX 포맷 헬퍼
 * 순수 함수: 상태/날짜/시간/도구 포맷팅 + 행 높이 계산
 */

import type { RoadmapCell, RoadmapMatrixCell } from '../../roadmap';

// ============================================================================
// 포맷 헬퍼
// ============================================================================

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT': return '초안';
    case 'FINAL': return '확정본';
    case 'ARCHIVED': return '보관본';
    default: return status;
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function buildCourseNumberMap(courses: RoadmapCell[]): Map<string, number> {
  const map = new Map<string, number>();
  courses.forEach((c, i) => map.set(c.course_name, i + 1));
  return map;
}

export function formatMatrixCell(cells: RoadmapMatrixCell[] | undefined, numberMap: Map<string, number>): string {
  if (!cells || cells.length === 0) return '-';
  return cells
    .map(c => {
      const no = numberMap.get(c.course_name);
      const prefix = no ? `No.${no} ` : '';
      return `${prefix}${c.course_name}\n(${c.recommended_hours}시간)`;
    })
    .join('\n\n');
}

export function sumMatrixHours(cells: RoadmapMatrixCell[] | undefined): number {
  if (!cells || cells.length === 0) return 0;
  return cells.reduce((sum, c) => sum + c.recommended_hours, 0);
}

export function formatTools(tools: { name: string; free_tier_info: string }[] | undefined): string {
  if (!tools || tools.length === 0) return '-';
  return tools.map(t => `${t.name} (${t.free_tier_info})`).join(', ');
}

/**
 * 셀 너비를 고려한 행 높이 계산.
 * wrapText 활성화 시 한글 폭(영문 대비 ~1.8배)을 반영하여
 * 자동 줄바꿈이 발생했을 때의 실제 높이를 추정한다.
 */
export function calcRowHeight(text: string, colWidthWch: number, baseHeight = 22, lineHeight = 14.5): number {
  if (!text) return baseHeight;

  // 한글 기준: wch를 한글 글자 수로 변환 (한글 1자 ≈ 영문 1.8자 폭)
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

export function formatHours(hours: number): string {
  return hours > 0 ? `${hours}시간` : '-';
}
