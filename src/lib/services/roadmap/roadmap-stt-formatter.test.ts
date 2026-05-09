/**
 * roadmap-stt-formatter.ts 테스트
 * - isSttInsights: STT 인사이트 타입 가드
 * - hasItems: 배열 항목 존재 여부
 * - toMarkdownList: 배열 → 마크다운 리스트
 * - formatSttInsights: STT 인사이트 → 프롬프트 문자열
 * - buildSttInsightsSection: 인터뷰 데이터에서 STT 인사이트 섹션 생성
 */

import { describe, it, expect } from 'vitest';
import {
  isSttInsights,
  hasItems,
  toMarkdownList,
  formatSttInsights,
  buildSttInsightsSection,
} from './roadmap-stt-formatter';

// ─── isSttInsights ────────────────────────────────────────────────────────

describe('isSttInsights', () => {
  it('null → false', () => {
    expect(isSttInsights(null)).toBe(false);
  });

  it('undefined → false', () => {
    expect(isSttInsights(undefined)).toBe(false);
  });

  it('빈 객체 → false', () => {
    expect(isSttInsights({})).toBe(false);
  });

  it('배열 필드 1개만 있어도 true', () => {
    expect(isSttInsights({ 추가_업무: ['데이터 입력'] })).toBe(true);
  });

  it('문자열 필드 1개만 있어도 true', () => {
    expect(isSttInsights({ 조직_맥락: '부서 간 협업 부족' })).toBe(true);
  });

  it('모든 필드가 유효하면 true', () => {
    expect(
      isSttInsights({
        추가_업무: ['업무1'],
        추가_페인포인트: ['포인트1'],
        숨은_니즈: ['니즈1'],
        조직_맥락: '맥락',
        AI_태도: '긍정적',
        주요_인용: ['인용1'],
      })
    ).toBe(true);
  });
});

// ─── hasItems ─────────────────────────────────────────────────────────────

describe('hasItems', () => {
  it('null → false', () => {
    expect(hasItems(null)).toBe(false);
  });

  it('빈 배열 → false', () => {
    expect(hasItems([])).toBe(false);
  });

  it('항목이 있는 배열 → true', () => {
    expect(hasItems(['항목'])).toBe(true);
  });

  it('비배열(문자열) → false', () => {
    expect(hasItems('문자열')).toBe(false);
  });
});

// ─── toMarkdownList ───────────────────────────────────────────────────────

describe('toMarkdownList', () => {
  it('빈 배열 → 빈 문자열', () => {
    expect(toMarkdownList([])).toBe('');
  });

  it('단일 항목 → "- 항목"', () => {
    expect(toMarkdownList(['항목'])).toBe('- 항목');
  });

  it('다중 항목 → 줄바꿈으로 구분된 마크다운 리스트', () => {
    expect(toMarkdownList(['A', 'B', 'C'])).toBe('- A\n- B\n- C');
  });
});

// ─── formatSttInsights ────────────────────────────────────────────────────

describe('formatSttInsights', () => {
  it('모든 필드가 비어있거나 undefined이면 빈 문자열을 반환한다', () => {
    expect(formatSttInsights({})).toBe('');
  });

  it('일부 필드만 유효하면 해당 섹션만 포함하고 \\n\\n으로 구분한다', () => {
    const result = formatSttInsights({
      추가_업무: ['데이터 입력', '보고서 작성'],
      AI_태도: '긍정적이나 불안감 있음',
    });

    expect(result).toContain('**추가로 파악된 업무:**');
    expect(result).toContain('- 데이터 입력');
    expect(result).toContain('- 보고서 작성');
    expect(result).toContain('**AI 도입에 대한 태도:**');
    expect(result).toContain('긍정적이나 불안감 있음');

    // 두 섹션 사이에 \n\n 구분
    const sections = result.split('\n\n');
    expect(sections).toHaveLength(2);

    // 누락된 필드의 섹션은 포함하지 않음
    expect(result).not.toContain('**추가 페인포인트:**');
    expect(result).not.toContain('**숨은 니즈:**');
    expect(result).not.toContain('**조직 맥락:**');
    expect(result).not.toContain('**인터뷰 주요 발언:**');
  });
});

// ─── buildSttInsightsSection ──────────────────────────────────────────────

describe('buildSttInsightsSection', () => {
  it('stt_insights가 없는 인터뷰 → 빈 문자열', () => {
    expect(buildSttInsightsSection({ notes: '메모' })).toBe('');
  });

  it('유효한 stt_insights가 있으면 마크다운 헤더와 포맷된 내용을 반환한다', () => {
    const interview = {
      stt_insights: {
        숨은_니즈: ['자동화된 보고서'],
        조직_맥락: 'IT 부서 인력 부족',
      },
    };

    const result = buildSttInsightsSection(interview);

    expect(result).toContain('### STT 인터뷰 분석 인사이트');
    expect(result).toContain('인터뷰 녹취록에서 AI가 추출한 추가 정보입니다');
    expect(result).toContain('**숨은 니즈:**');
    expect(result).toContain('- 자동화된 보고서');
    expect(result).toContain('**조직 맥락:**');
    expect(result).toContain('IT 부서 인력 부족');
  });

  // PBL 인터뷰 스키마(interview-pbl.ts)는 camelCase `sttInsights` 로 저장한다.
  // 본 함수는 로드맵·PBL 양쪽에서 재사용되므로 두 명명을 모두 인식해야 한다.
  it('camelCase sttInsights 키도 인식한다 (PBL 호환)', () => {
    const interview = {
      sttInsights: {
        AI_태도: 'PBL 도입에 적극적',
      },
    };

    const result = buildSttInsightsSection(interview);

    expect(result).toContain('### STT 인터뷰 분석 인사이트');
    expect(result).toContain('**AI 도입에 대한 태도:**');
    expect(result).toContain('PBL 도입에 적극적');
  });

  it('두 키가 동시에 있으면 stt_insights(snake_case)를 우선 사용한다', () => {
    const interview = {
      stt_insights: { AI_태도: 'snake 우선' },
      sttInsights: { AI_태도: 'camel 무시' },
    };

    const result = buildSttInsightsSection(interview);

    expect(result).toContain('snake 우선');
    expect(result).not.toContain('camel 무시');
  });
});
