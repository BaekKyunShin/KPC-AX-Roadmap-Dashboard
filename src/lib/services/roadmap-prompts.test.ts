import { describe, it, expect } from 'vitest';
import {
  isSttInsights,
  hasItems,
  toMarkdownList,
  formatSttInsights,
  buildSttInsightsSection,
  buildSystemPrompt,
  buildUserPrompt,
} from './roadmap';
import type { SttInsights } from '@/lib/schemas/interview';
import type { ConsultantProfile } from '@/types/database';

// ============================================================================
// 테스트 헬퍼: 팩토리 함수
// ============================================================================

function makeFullSttInsights(overrides: Partial<SttInsights> = {}): SttInsights {
  return {
    추가_업무: ['보고서 작성', '데이터 입력'],
    추가_페인포인트: ['수작업 반복', '시간 소모'],
    숨은_니즈: ['자동화 도구 도입'],
    조직_맥락: '50인 규모의 제조업체',
    AI_태도: '긍정적이나 기술 역량 부족',
    주요_인용: ['AI 도입이 시급합니다', '반복 업무가 너무 많아요'],
    ...overrides,
  };
}

function makeInterview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    job_tasks: [{ task_name: '데이터 분석', description: '매출 데이터 분석' }],
    pain_points: [{ description: '수작업 반복' }],
    constraints: [{ description: '예산 제한' }],
    improvement_goals: [{ description: '업무 자동화' }],
    customer_requirements: '빠른 도입',
    notes: '추가 메모 내용',
    ...overrides,
  };
}

function makeProjectData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    company_name: '테스트 주식회사',
    industry: '제조업',
    sub_industries: ['자동차', '전자'],
    company_size: '50-299',
    customer_comment: '빠른 교육 도입 희망',
    ...overrides,
  };
}

function makeConsultantProfile(overrides: Partial<ConsultantProfile> = {}): ConsultantProfile {
  return {
    id: 'test-id',
    user_id: 'test-user-id',
    expertise_domains: ['AI 교육', '데이터 분석'],
    available_industries: ['제조업', 'IT'],
    sub_industries: ['자동차'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
    coaching_methods: ['PBL', 'WORKSHOP'],
    skill_tags: ['ChatGPT', 'Python'],
    years_of_experience: 5,
    affiliation: '테스트 컨설팅',
    representative_experience: '대표 경험',
    portfolio: '포트폴리오',
    strengths_constraints: '강점/제약',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// isSttInsights — 타입 가드
// ============================================================================

describe('isSttInsights', () => {
  it('유효한 SttInsights 객체를 인식한다', () => {
    expect(isSttInsights(makeFullSttInsights())).toBe(true);
  });

  it('배열 필드 하나만 있어도 true 반환', () => {
    expect(isSttInsights({ 추가_업무: ['업무1'] })).toBe(true);
    expect(isSttInsights({ 추가_페인포인트: ['페인포인트1'] })).toBe(true);
    expect(isSttInsights({ 숨은_니즈: ['니즈1'] })).toBe(true);
    expect(isSttInsights({ 주요_인용: ['인용1'] })).toBe(true);
  });

  it('문자열 필드 하나만 있어도 true 반환', () => {
    expect(isSttInsights({ 조직_맥락: '맥락' })).toBe(true);
    expect(isSttInsights({ AI_태도: '긍정적' })).toBe(true);
  });

  it('null/undefined/비객체는 false 반환', () => {
    expect(isSttInsights(null)).toBe(false);
    expect(isSttInsights(undefined)).toBe(false);
    expect(isSttInsights('문자열')).toBe(false);
    expect(isSttInsights(123)).toBe(false);
    expect(isSttInsights(true)).toBe(false);
  });

  it('빈 객체는 false 반환', () => {
    expect(isSttInsights({})).toBe(false);
  });

  it('관련 없는 키만 있는 객체는 false 반환', () => {
    expect(isSttInsights({ foo: 'bar', baz: 123 })).toBe(false);
  });
});

// ============================================================================
// hasItems — 배열 존재 확인
// ============================================================================

describe('hasItems', () => {
  it('비어있지 않은 배열은 true 반환', () => {
    expect(hasItems(['a', 'b'])).toBe(true);
    expect(hasItems(['하나'])).toBe(true);
  });

  it('빈 배열은 false 반환', () => {
    expect(hasItems([])).toBe(false);
  });

  it('배열이 아닌 값은 false 반환', () => {
    expect(hasItems(null)).toBe(false);
    expect(hasItems(undefined)).toBe(false);
    expect(hasItems('문자열')).toBe(false);
    expect(hasItems(123)).toBe(false);
    expect(hasItems({})).toBe(false);
  });
});

// ============================================================================
// toMarkdownList — 마크다운 리스트 변환
// ============================================================================

describe('toMarkdownList', () => {
  it('문자열 배열을 마크다운 리스트로 변환', () => {
    expect(toMarkdownList(['항목1', '항목2', '항목3'])).toBe(
      '- 항목1\n- 항목2\n- 항목3'
    );
  });

  it('단일 항목도 정상 변환', () => {
    expect(toMarkdownList(['단일 항목'])).toBe('- 단일 항목');
  });

  it('빈 배열은 빈 문자열 반환', () => {
    expect(toMarkdownList([])).toBe('');
  });
});

// ============================================================================
// formatSttInsights — STT 인사이트 포맷팅
// ============================================================================

describe('formatSttInsights', () => {
  it('모든 필드가 있을 때 전체 섹션 생성', () => {
    const insights = makeFullSttInsights();
    const result = formatSttInsights(insights);

    expect(result).toContain('**추가로 파악된 업무:**');
    expect(result).toContain('- 보고서 작성');
    expect(result).toContain('- 데이터 입력');
    expect(result).toContain('**추가 페인포인트:**');
    expect(result).toContain('- 수작업 반복');
    expect(result).toContain('**숨은 니즈:**');
    expect(result).toContain('- 자동화 도구 도입');
    expect(result).toContain('**조직 맥락:**');
    expect(result).toContain('50인 규모의 제조업체');
    expect(result).toContain('**AI 도입에 대한 태도:**');
    expect(result).toContain('긍정적이나 기술 역량 부족');
    expect(result).toContain('**인터뷰 주요 발언:**');
    expect(result).toContain('- AI 도입이 시급합니다');
  });

  it('섹션 간에 빈 줄로 구분', () => {
    const insights = makeFullSttInsights();
    const result = formatSttInsights(insights);
    // 두 개 이상의 섹션이 \n\n으로 구분
    expect(result).toContain('\n\n');
  });

  it('빈 배열 필드는 섹션에 포함하지 않음', () => {
    const insights = makeFullSttInsights({
      추가_업무: [],
      추가_페인포인트: [],
      숨은_니즈: [],
      주요_인용: [],
    });
    const result = formatSttInsights(insights);

    expect(result).not.toContain('**추가로 파악된 업무:**');
    expect(result).not.toContain('**추가 페인포인트:**');
    expect(result).not.toContain('**숨은 니즈:**');
    expect(result).not.toContain('**인터뷰 주요 발언:**');
    // 문자열 필드는 여전히 포함
    expect(result).toContain('**조직 맥락:**');
    expect(result).toContain('**AI 도입에 대한 태도:**');
  });

  it('undefined 배열 필드는 섹션에 포함하지 않음', () => {
    const insights: SttInsights = {
      조직_맥락: '맥락만 있음',
    };
    const result = formatSttInsights(insights);

    expect(result).toContain('**조직 맥락:**');
    expect(result).not.toContain('**추가로 파악된 업무:**');
    expect(result).not.toContain('**추가 페인포인트:**');
    expect(result).not.toContain('**숨은 니즈:**');
    expect(result).not.toContain('**인터뷰 주요 발언:**');
    expect(result).not.toContain('**AI 도입에 대한 태도:**');
  });

  it('모든 필드가 비어있으면 빈 문자열 반환', () => {
    const insights: SttInsights = {};
    const result = formatSttInsights(insights);
    expect(result).toBe('');
  });

  it('falsy 문자열 필드는 섹션에 포함하지 않음', () => {
    const insights: SttInsights = {
      조직_맥락: '',
      AI_태도: '',
    };
    const result = formatSttInsights(insights);
    expect(result).not.toContain('**조직 맥락:**');
    expect(result).not.toContain('**AI 도입에 대한 태도:**');
  });
});

// ============================================================================
// buildSttInsightsSection — STT 인사이트 섹션
// ============================================================================

describe('buildSttInsightsSection', () => {
  it('stt_insights가 있으면 섹션을 생성', () => {
    const interview = makeInterview({
      stt_insights: makeFullSttInsights(),
    });
    const result = buildSttInsightsSection(interview);

    expect(result).toContain('### STT 인터뷰 분석 인사이트');
    expect(result).toContain('인터뷰 녹취록에서 AI가 추출한 추가 정보입니다');
    expect(result).toContain('**추가로 파악된 업무:**');
  });

  it('stt_insights가 없으면 빈 문자열 반환', () => {
    const interview = makeInterview();
    const result = buildSttInsightsSection(interview);
    expect(result).toBe('');
  });

  it('stt_insights가 null이면 빈 문자열 반환', () => {
    const interview = makeInterview({ stt_insights: null });
    const result = buildSttInsightsSection(interview);
    expect(result).toBe('');
  });

  it('stt_insights가 빈 객체면 빈 문자열 반환 (유효 필드 없음)', () => {
    const interview = makeInterview({ stt_insights: {} });
    const result = buildSttInsightsSection(interview);
    expect(result).toBe('');
  });
});

// ============================================================================
// buildSystemPrompt — 시스템 프롬프트
// ============================================================================

describe('buildSystemPrompt', () => {
  it('시스템 프롬프트 문자열을 반환', () => {
    const result = buildSystemPrompt();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('AI 교육 전문가 역할이 포함됨', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('기업 AI 교육 로드맵 전문가');
  });

  it('핵심 원칙 9개가 포함됨', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('## 핵심 원칙');
    expect(result).toContain('1. **업무(target_task) 제한');
    expect(result).toContain('2. **셀 채우기');
    expect(result).toContain('3. **무료 도구 전제**');
    expect(result).toContain('4. **40시간 제한**');
    expect(result).toContain('5. **시간 일관성');
    expect(result).toContain('6. **실용성 중심**');
    expect(result).toContain('7. **측정 가능한 성과**');
    expect(result).toContain('8. **PBL 과정은 반드시 courses에서 선정');
    expect(result).toContain('9. **교육 난이도 원칙**');
  });

  it('JSON 출력 형식 가이드가 포함됨', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('## 출력 형식');
    expect(result).toContain('JSON');
    expect(result).toContain('diagnosis_summary');
    expect(result).toContain('courses');
    expect(result).toContain('pbl_course');
  });

  it('RoadmapCell 구조 설명이 포함됨', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('RoadmapCell 구조');
    expect(result).toContain('course_name');
    expect(result).toContain('curriculum');
    expect(result).toContain('recommended_hours');
  });

  it('PBL 작성 지침이 포함됨', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('## PBL 과정 상세 작성 지침');
    expect(result).toContain('deliverables');
    expect(result).toContain('business_impact');
  });
});

// ============================================================================
// buildUserPrompt — 사용자 프롬프트
// ============================================================================

describe('buildUserPrompt', () => {
  const defaultProjectData = makeProjectData();
  const defaultSelfAssessment = { scores: { 기초: 3, 활용: 2 } };
  const defaultInterview = makeInterview();

  it('기본 기업 정보 섹션이 포함됨', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );

    expect(result).toContain('## 기업 정보');
    expect(result).toContain('테스트 주식회사');
    expect(result).toContain('제조업');
    expect(result).toContain('자동차, 전자');
    expect(result).toContain('50-299');
    expect(result).toContain('빠른 교육 도입 희망');
  });

  it('세부 업종이 없으면 "미지정"으로 표시', () => {
    const projectData = makeProjectData({ sub_industries: undefined });
    const result = buildUserPrompt(
      projectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('세부 업종: 미지정');
  });

  it('세부 업종이 빈 배열이면 "미지정"으로 표시', () => {
    const projectData = makeProjectData({ sub_industries: [] });
    const result = buildUserPrompt(
      projectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('세부 업종: 미지정');
  });

  it('요청사항이 없으면 "없음"으로 표시', () => {
    const projectData = makeProjectData({ customer_comment: '' });
    const result = buildUserPrompt(
      projectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('요청사항: 없음');
  });

  it('자가진단 결과가 JSON으로 포함됨', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('## 자가진단 결과');
    expect(result).toContain('"기초": 3');
    expect(result).toContain('"활용": 2');
  });

  it('인터뷰 결과 섹션들이 포함됨', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('## 현장 인터뷰 결과');
    expect(result).toContain('### 세부업무');
    expect(result).toContain('### 페인포인트');
    expect(result).toContain('### 제약사항');
    expect(result).toContain('### 개선 목표');
    expect(result).toContain('### 기업 요구사항');
    expect(result).toContain('빠른 도입');
    expect(result).toContain('### 추가 메모');
    expect(result).toContain('추가 메모 내용');
  });

  it('기업 요구사항이 없으면 "없음"으로 표시', () => {
    const interview = makeInterview({ customer_requirements: '' });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      interview,
      null
    );
    expect(result).toContain('### 기업 요구사항\n없음');
  });

  it('추가 메모가 없으면 "없음"으로 표시', () => {
    const interview = makeInterview({ notes: '' });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      interview,
      null
    );
    expect(result).toContain('### 추가 메모\n없음');
  });

  it('JSON 응답 요청 문구로 끝남', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).toContain('반드시 JSON 형식으로만 응답하세요');
  });

  // --- 컨설턴트 프로필 ---

  it('컨설턴트 프로필이 있으면 섹션 추가', () => {
    const profile = makeConsultantProfile();
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile
    );
    expect(result).toContain('## 담당 컨설턴트 프로필');
    expect(result).toContain('AI 교육, 데이터 분석');
    expect(result).toContain('제조업, IT');
    expect(result).toContain('자동차');
    expect(result).toContain('BEGINNER, INTERMEDIATE');
    expect(result).toContain('PBL, WORKSHOP');
    expect(result).toContain('ChatGPT, Python');
    expect(result).toContain('5년');
  });

  it('컨설턴트 프로필이 null이면 섹션 미포함', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).not.toContain('## 담당 컨설턴트 프로필');
  });

  it('컨설턴트의 세부 업종이 없으면 "미지정" 표시', () => {
    const profile = makeConsultantProfile({ sub_industries: undefined });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile
    );
    expect(result).toContain('선호 세부 업종: 미지정');
  });

  it('컨설턴트의 가능 업종이 없으면 "미지정" 표시', () => {
    const profile = makeConsultantProfile({ available_industries: undefined as unknown as string[] });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile
    );
    expect(result).toContain('가능 업종: 미지정');
  });

  it('컨설턴트 경력이 0이면 "0년" 표시', () => {
    const profile = makeConsultantProfile({ years_of_experience: 0 });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile
    );
    expect(result).toContain('경력: 0년');
  });

  // --- 수정 요청 ---

  it('revisionPrompt가 있으면 수정 요청 섹션 추가', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null,
      '시간을 줄여주세요'
    );
    expect(result).toContain('## 수정 요청');
    expect(result).toContain('시간을 줄여주세요');
    expect(result).toContain('수정 요청을 반영하여 로드맵을 재생성해주세요');
  });

  it('revisionPrompt가 없으면 수정 요청 섹션 미포함', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).not.toContain('## 수정 요청');
  });

  // --- 테스트 모드 ---

  it('테스트 모드에서 테스트 모드 표시가 포함됨', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null,
      undefined,
      true
    );
    expect(result).toContain('**테스트 모드**');
    expect(result).toContain('컨설턴트 연습용 로드맵');
  });

  it('테스트 모드에서 selfAssessment가 null이면 안내 메시지 표시', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      null,
      defaultInterview,
      null,
      undefined,
      true
    );
    expect(result).toContain('테스트 모드 - 자가진단 결과 없음');
  });

  it('일반 모드에서 selfAssessment가 null이면 JSON null 표시', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      null,
      defaultInterview,
      null,
      undefined,
      false
    );
    // selfAssessment?.scores => undefined => JSON.stringify(undefined) => undefined
    expect(result).not.toContain('테스트 모드 - 자가진단 결과 없음');
  });

  it('테스트 모드에서 컨설턴트 프로필 섹션에 참조 자료 안내 포함', () => {
    const profile = makeConsultantProfile();
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile,
      undefined,
      true
    );
    expect(result).toContain('테스트 모드에서 중요 참조 자료');
    expect(result).toContain('컨설턴트의 전문성을 기반으로 로드맵을 설계하세요');
  });

  it('일반 모드에서 컨설턴트 프로필 섹션에 테스트 모드 안내 미포함', () => {
    const profile = makeConsultantProfile();
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      profile,
      undefined,
      false
    );
    expect(result).not.toContain('테스트 모드에서 중요 참조 자료');
    expect(result).not.toContain('컨설턴트의 전문성을 기반으로 로드맵을 설계하세요');
  });

  // --- STT 인사이트 통합 ---

  it('인터뷰에 stt_insights가 있으면 프롬프트에 STT 섹션 포함', () => {
    const interview = makeInterview({
      stt_insights: makeFullSttInsights(),
    });
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      interview,
      null
    );
    expect(result).toContain('### STT 인터뷰 분석 인사이트');
  });

  it('인터뷰에 stt_insights가 없으면 STT 섹션 미포함', () => {
    const result = buildUserPrompt(
      defaultProjectData,
      defaultSelfAssessment,
      defaultInterview,
      null
    );
    expect(result).not.toContain('### STT 인터뷰 분석 인사이트');
  });
});
