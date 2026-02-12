/**
 * export-xlsx.ts 테스트
 * Phase 1 안전망: 순수 함수의 현재 동작을 고정
 *
 * - getStatusLabel: 상태 코드 → 한글 라벨 변환
 * - formatDate: 날짜 문자열 → 한국식 포맷
 * - buildCourseNumberMap: 과정명 → 순번 매핑
 * - formatMatrixCell: 매트릭스 셀 텍스트 포맷
 * - sumMatrixHours: 매트릭스 셀 시간 합산
 * - formatTools: 도구 목록 포맷
 * - calcRowHeight: 한글 폭 고려한 행 높이 계산
 * - formatHours: 시간 포맷
 */

import { describe, it, expect } from 'vitest';
import type { RoadmapCell, RoadmapMatrixCell } from './roadmap';
import {
  getStatusLabel,
  formatDate,
  buildCourseNumberMap,
  formatMatrixCell,
  sumMatrixHours,
  formatTools,
  calcRowHeight,
  formatHours,
} from './export-xlsx';

// ─── getStatusLabel ─────────────────────────────────────────────────────────

describe('getStatusLabel', () => {
  it('DRAFT → "초안"을 반환한다', () => {
    expect(getStatusLabel('DRAFT')).toBe('초안');
  });

  it('FINAL → "확정본"을 반환한다', () => {
    expect(getStatusLabel('FINAL')).toBe('확정본');
  });

  it('ARCHIVED → "보관본"을 반환한다', () => {
    expect(getStatusLabel('ARCHIVED')).toBe('보관본');
  });

  it('알 수 없는 상태는 입력값 그대로 반환한다', () => {
    expect(getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(getStatusLabel('')).toBe('');
  });
});

// ─── formatDate ─────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('ISO 날짜 문자열을 "YYYY년 M월 D일" 형식으로 변환한다', () => {
    const result = formatDate('2026-02-12T10:00:00Z');
    // 로컬 타임존에 따라 날짜가 달라질 수 있으므로 형식만 확인
    expect(result).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
  });

  it('월과 일에 0 패딩을 하지 않는다', () => {
    // 1월 5일 → "1월 5일" (01월 05일이 아님)
    const result = formatDate('2026-01-05T00:00:00Z');
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/5일/);
    expect(result).not.toMatch(/01월/);
    expect(result).not.toMatch(/05일/);
  });

  it('날짜 전용 문자열도 처리한다', () => {
    const result = formatDate('2025-12-25');
    expect(result).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
  });
});

// ─── buildCourseNumberMap ───────────────────────────────────────────────────

describe('buildCourseNumberMap', () => {
  it('과정 배열로부터 과정명 → 1-based 순번 맵을 생성한다', () => {
    const courses = [
      { course_name: 'AI 기초' },
      { course_name: '데이터 분석' },
      { course_name: '딥러닝 실습' },
    ] as RoadmapCell[];

    const map = buildCourseNumberMap(courses);

    expect(map.get('AI 기초')).toBe(1);
    expect(map.get('데이터 분석')).toBe(2);
    expect(map.get('딥러닝 실습')).toBe(3);
  });

  it('빈 배열이면 빈 Map을 반환한다', () => {
    const map = buildCourseNumberMap([] as RoadmapCell[]);
    expect(map.size).toBe(0);
  });

  it('과정이 1개인 경우 순번 1을 할당한다', () => {
    const courses = [{ course_name: '단일 과정' }] as RoadmapCell[];
    const map = buildCourseNumberMap(courses);
    expect(map.get('단일 과정')).toBe(1);
    expect(map.size).toBe(1);
  });
});

// ─── formatMatrixCell ───────────────────────────────────────────────────────

describe('formatMatrixCell', () => {
  const numberMap = new Map<string, number>([
    ['AI 기초', 1],
    ['데이터 분석', 2],
  ]);

  it('undefined이면 "-"를 반환한다', () => {
    expect(formatMatrixCell(undefined, numberMap)).toBe('-');
  });

  it('빈 배열이면 "-"를 반환한다', () => {
    expect(formatMatrixCell([], numberMap)).toBe('-');
  });

  it('단일 셀을 "No.N 과정명\\n(시간시간)" 형식으로 포맷한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'AI 기초', recommended_hours: 8 },
    ];

    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('No.1 AI 기초\n(8시간)');
  });

  it('여러 셀은 "\\n\\n"으로 구분한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'AI 기초', recommended_hours: 8 },
      { course_name: '데이터 분석', recommended_hours: 16 },
    ];

    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('No.1 AI 기초\n(8시간)\n\nNo.2 데이터 분석\n(16시간)');
  });

  it('numberMap에 없는 과정은 No. 접두사 없이 포맷한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: '미등록 과정', recommended_hours: 4 },
    ];

    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('미등록 과정\n(4시간)');
  });
});

// ─── sumMatrixHours ─────────────────────────────────────────────────────────

describe('sumMatrixHours', () => {
  it('undefined이면 0을 반환한다', () => {
    expect(sumMatrixHours(undefined)).toBe(0);
  });

  it('빈 배열이면 0을 반환한다', () => {
    expect(sumMatrixHours([])).toBe(0);
  });

  it('단일 셀의 시간을 반환한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'AI 기초', recommended_hours: 8 },
    ];
    expect(sumMatrixHours(cells)).toBe(8);
  });

  it('여러 셀의 시간을 합산한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'AI 기초', recommended_hours: 8 },
      { course_name: '데이터 분석', recommended_hours: 16 },
      { course_name: '딥러닝', recommended_hours: 24 },
    ];
    expect(sumMatrixHours(cells)).toBe(48);
  });

  it('시간이 0인 셀도 정상 처리한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'A', recommended_hours: 0 },
      { course_name: 'B', recommended_hours: 10 },
    ];
    expect(sumMatrixHours(cells)).toBe(10);
  });
});

// ─── formatTools ────────────────────────────────────────────────────────────

describe('formatTools', () => {
  it('undefined이면 "-"를 반환한다', () => {
    expect(formatTools(undefined)).toBe('-');
  });

  it('빈 배열이면 "-"를 반환한다', () => {
    expect(formatTools([])).toBe('-');
  });

  it('단일 도구를 "이름 (무료범위)" 형식으로 포맷한다', () => {
    const tools = [{ name: 'ChatGPT', free_tier_info: '무료 플랜 가능' }];
    expect(formatTools(tools)).toBe('ChatGPT (무료 플랜 가능)');
  });

  it('여러 도구를 쉼표로 구분한다', () => {
    const tools = [
      { name: 'ChatGPT', free_tier_info: '무료' },
      { name: 'Python', free_tier_info: '오픈소스' },
      { name: 'Jupyter', free_tier_info: '무료' },
    ];
    expect(formatTools(tools)).toBe('ChatGPT (무료), Python (오픈소스), Jupyter (무료)');
  });
});

// ─── calcRowHeight ──────────────────────────────────────────────────────────

describe('calcRowHeight', () => {
  it('빈 문자열이면 baseHeight를 반환한다', () => {
    expect(calcRowHeight('', 30)).toBe(22);
  });

  it('falsy 값이면 baseHeight를 반환한다', () => {
    // null/undefined를 문자열로 전달하는 경우
    expect(calcRowHeight(null as unknown as string, 30)).toBe(22);
    expect(calcRowHeight(undefined as unknown as string, 30)).toBe(22);
  });

  it('커스텀 baseHeight를 사용한다', () => {
    expect(calcRowHeight('', 30, 40)).toBe(40);
  });

  it('짧은 한 줄 텍스트는 baseHeight를 반환한다', () => {
    // 짧은 텍스트(1줄 이내) → baseHeight
    const result = calcRowHeight('짧은', 30, 22);
    expect(result).toBe(22);
  });

  it('개행 문자가 있으면 줄 수에 반영한다', () => {
    const withNewlines = '첫 줄\n둘째 줄\n셋째 줄';
    const withoutNewlines = '짧은 텍스트';

    const heightMulti = calcRowHeight(withNewlines, 100);
    const heightSingle = calcRowHeight(withoutNewlines, 100);

    expect(heightMulti).toBeGreaterThan(heightSingle);
  });

  it('빈 줄은 0.6줄로 계산한다', () => {
    const withEmptyLine = '첫 줄\n\n셋째 줄'; // 가운데 빈 줄
    const withoutEmptyLine = '첫 줄\n셋째 줄';

    const heightWithEmpty = calcRowHeight(withEmptyLine, 100);
    const heightWithout = calcRowHeight(withoutEmptyLine, 100);

    // 빈 줄이 0.6줄로 계산되므로 약간 더 큼
    expect(heightWithEmpty).toBeGreaterThan(heightWithout);
  });

  it('한글 텍스트는 영문보다 더 높은 행을 필요로 한다', () => {
    // 같은 길이의 한글 vs 영문, 같은 열 너비
    const korean = '가나다라마바사아자차카타파하';
    const english = 'abcdefghijklmn';

    const koreanHeight = calcRowHeight(korean, 20);
    const englishHeight = calcRowHeight(english, 20);

    expect(koreanHeight).toBeGreaterThan(englishHeight);
  });

  it('열 너비가 좁으면 더 높은 행을 계산한다', () => {
    const text = '이것은 꽤 긴 한글 문장입니다 여러 줄이 필요할 수 있습니다';

    const narrowHeight = calcRowHeight(text, 10);
    const wideHeight = calcRowHeight(text, 100);

    expect(narrowHeight).toBeGreaterThan(wideHeight);
  });

  it('커스텀 lineHeight를 반영한다', () => {
    const text = '첫 줄\n둘째 줄\n셋째 줄';

    const defaultHeight = calcRowHeight(text, 100, 22, 14.5);
    const tallHeight = calcRowHeight(text, 100, 22, 30);

    expect(tallHeight).toBeGreaterThan(defaultHeight);
  });

  it('최소값으로 baseHeight를 보장한다', () => {
    // 짧은 텍스트여도 baseHeight 미만이 되지 않음
    expect(calcRowHeight('a', 100, 50)).toBeGreaterThanOrEqual(50);
  });

  it('charsPerLine이 최소 4 이상이 되도록 보장한다', () => {
    // colWidthWch가 매우 작아도 에러 없이 동작
    const result = calcRowHeight('한글 테스트', 1);
    expect(result).toBeGreaterThanOrEqual(22);
  });
});

// ─── formatHours ────────────────────────────────────────────────────────────

describe('formatHours', () => {
  it('양수 시간은 "N시간" 형식으로 반환한다', () => {
    expect(formatHours(8)).toBe('8시간');
    expect(formatHours(100)).toBe('100시간');
  });

  it('0이면 "-"를 반환한다', () => {
    expect(formatHours(0)).toBe('-');
  });

  it('음수도 "-"를 반환한다', () => {
    expect(formatHours(-5)).toBe('-');
  });
});
