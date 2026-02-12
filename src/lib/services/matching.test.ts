import { describe, it, expect } from 'vitest';
import {
  calculateIndustryScore,
  calculateSubIndustryScore,
  calculateExpertiseScore,
  calculateSkillScore,
  calculateLevelScore,
  calculateExperienceScore,
  generateRationale,
  calculateMatchingScore,
} from './matching';
import type { MatchingCriteria, CandidateScore } from './matching';
import type { ConsultantProfile, SelfAssessmentScore } from '@/types/database';

// ============================================================================
// 테스트 헬퍼: 최소한의 팩토리 함수
// ============================================================================

function makeAssessmentScores(
  overrides: Partial<SelfAssessmentScore> = {}
): SelfAssessmentScore {
  return {
    total_score: 50,
    max_possible_score: 100,
    dimension_scores: [
      { dimension: 'AI 활용 현황', score: 3, max_score: 10 },
      { dimension: '데이터 활용', score: 7, max_score: 10 },
      { dimension: '업무 프로세스', score: 4, max_score: 10 },
      { dimension: '조직 역량', score: 8, max_score: 10 },
    ],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ConsultantProfile> = {}): ConsultantProfile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    expertise_domains: ['생성형 AI', '데이터 분석'],
    available_industries: ['제조업', 'IT/소프트웨어'],
    sub_industries: ['자동차', '반도체'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
    coaching_methods: ['LECTURE', 'WORKSHOP'],
    skill_tags: ['생성형 AI 활용 (ChatGPT, Claude, Gemini 등)', '데이터 수집/정제'],
    years_of_experience: 7,
    affiliation: '테스트 소속',
    representative_experience: '대표 경험',
    portfolio: '포트폴리오',
    strengths_constraints: '강점과 제약',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

function makeCriteria(overrides: Partial<MatchingCriteria> = {}): MatchingCriteria {
  return {
    industry: '제조업',
    subIndustries: ['자동차'],
    companySize: '50-299',
    assessmentScores: makeAssessmentScores(),
    ...overrides,
  };
}

// ============================================================================
// calculateIndustryScore
// ============================================================================

describe('calculateIndustryScore', () => {
  it('업종 정확히 일치 시 20점 반환', () => {
    expect(calculateIndustryScore(['제조업', 'IT/소프트웨어'], '제조업')).toBe(20);
  });

  it('관련 업종 일치 시 12점 반환', () => {
    // 제조업의 관련 업종: 유통/물류, IT/소프트웨어
    expect(calculateIndustryScore(['IT/소프트웨어'], '제조업')).toBe(12);
  });

  it('유통/물류는 제조업의 관련 업종으로 12점', () => {
    expect(calculateIndustryScore(['유통/물류'], '제조업')).toBe(12);
  });

  it('일치하는 업종이 전혀 없으면 4점 반환', () => {
    expect(calculateIndustryScore(['교육', '의료'], '제조업')).toBe(4);
  });

  it('빈 업종 목록이면 4점 반환', () => {
    expect(calculateIndustryScore([], '제조업')).toBe(4);
  });

  it('관련 업종이 정의되지 않은 업종이면 직접 일치만 확인', () => {
    // '교육'은 RELATED_INDUSTRIES에 없음
    expect(calculateIndustryScore(['교육'], '교육')).toBe(20);
    expect(calculateIndustryScore(['제조업'], '교육')).toBe(4);
  });

  it('서비스업 ↔ 유통/물류는 관련 업종', () => {
    expect(calculateIndustryScore(['유통/물류'], '서비스업')).toBe(12);
    expect(calculateIndustryScore(['서비스업'], '유통/물류')).toBe(12);
  });
});

// ============================================================================
// calculateSubIndustryScore
// ============================================================================

describe('calculateSubIndustryScore', () => {
  it('프로젝트 세부 업종 미지정 시 3점', () => {
    const result = calculateSubIndustryScore(['자동차'], []);
    expect(result.score).toBe(3);
    expect(result.explanation).toContain('미지정');
  });

  it('컨설턴트 세부 업종 미지정 시 1점', () => {
    const result = calculateSubIndustryScore([], ['자동차']);
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('미지정');
  });

  it('정확히 일치하는 세부 업종이 있으면 5점', () => {
    const result = calculateSubIndustryScore(['자동차', '반도체'], ['자동차']);
    expect(result.score).toBe(5);
    expect(result.explanation).toContain('일치');
    expect(result.explanation).toContain('자동차');
  });

  it('대소문자 무시하여 일치 판정', () => {
    const result = calculateSubIndustryScore(['AI/ML'], ['ai/ml']);
    expect(result.score).toBe(5);
  });

  it('부분 문자열 일치 시 3점', () => {
    // '자동차 부품'이 '자동차'를 포함
    const result = calculateSubIndustryScore(['자동차 부품'], ['자동차']);
    expect(result.score).toBe(3);
    expect(result.explanation).toContain('유사');
  });

  it('역방향 부분 일치도 3점', () => {
    // '자동차'가 '자동차 부품'에 포함
    const result = calculateSubIndustryScore(['자동차'], ['자동차 부품']);
    expect(result.score).toBe(3);
  });

  it('완전히 일치하지 않으면 1점', () => {
    const result = calculateSubIndustryScore(['반도체'], ['식품']);
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('일치 없음');
  });

  it('양쪽 모두 빈 배열이면 프로젝트 미지정으로 3점', () => {
    const result = calculateSubIndustryScore([], []);
    expect(result.score).toBe(3);
  });
});

// ============================================================================
// calculateExpertiseScore
// ============================================================================

describe('calculateExpertiseScore', () => {
  it('전문분야 0개이면 0점', () => {
    const result = calculateExpertiseScore([]);
    expect(result.score).toBe(0);
  });

  it('전문분야 수 × 4점 계산', () => {
    expect(calculateExpertiseScore(['AI']).score).toBe(4);
    expect(calculateExpertiseScore(['AI', '데이터']).score).toBe(8);
    expect(calculateExpertiseScore(['AI', '데이터', '자동화']).score).toBe(12);
  });

  it('최대 20점 상한', () => {
    const domains = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(calculateExpertiseScore(domains).score).toBe(20);
  });

  it('정확히 5개일 때 20점', () => {
    const domains = ['A', 'B', 'C', 'D', 'E'];
    expect(calculateExpertiseScore(domains).score).toBe(20);
  });

  it('3개 초과 시 설명에 "등" 포함', () => {
    const result = calculateExpertiseScore(['AI', '데이터', '자동화', '보안']);
    expect(result.explanation).toContain('등');
  });

  it('3개 이하일 때 설명에 "등" 미포함', () => {
    const result = calculateExpertiseScore(['AI', '데이터']);
    expect(result.explanation).not.toContain('등');
  });

  it('설명에 전문분야 수 포함', () => {
    const result = calculateExpertiseScore(['AI', '데이터']);
    expect(result.explanation).toContain('2개');
  });
});

// ============================================================================
// calculateSkillScore
// ============================================================================

describe('calculateSkillScore', () => {
  it('약점 영역(60% 미만)과 매칭되는 스킬이 있으면 추가 점수', () => {
    // AI 활용 현황: 3/10 = 30% (약점)
    // '생성형 AI 활용' → 'AI 활용 현황'에 매핑됨
    const scores = makeAssessmentScores();
    const result = calculateSkillScore(
      ['생성형 AI 활용 (ChatGPT, Claude, Gemini 등)'],
      scores
    );
    // matchCount=1, skills.length=1 → min(20, 1*4 + 1) = 5
    expect(result.score).toBe(5);
    expect(result.explanation).toContain('1개 역량');
    expect(result.explanation).toContain('1개 매칭');
  });

  it('약점이 아닌 영역의 스킬은 기본 점수만', () => {
    // 조직 역량: 8/10 = 80% (약점 아님)
    const scores = makeAssessmentScores({
      dimension_scores: [
        { dimension: 'AI 활용 현황', score: 8, max_score: 10 },
        { dimension: '데이터 활용', score: 8, max_score: 10 },
        { dimension: '업무 프로세스', score: 8, max_score: 10 },
        { dimension: '조직 역량', score: 8, max_score: 10 },
      ],
    });
    const result = calculateSkillScore(
      ['생성형 AI 활용 (ChatGPT, Claude, Gemini 등)'],
      scores
    );
    // matchCount=0, skills.length=1 → min(20, 0*4 + 1) = 1
    expect(result.score).toBe(1);
  });

  it('빈 스킬 목록이면 0점', () => {
    const result = calculateSkillScore([], makeAssessmentScores());
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('0개 역량');
  });

  it('최대 20점 초과하지 않음', () => {
    const scores = makeAssessmentScores({
      dimension_scores: [
        { dimension: 'AI 활용 현황', score: 1, max_score: 10 },
        { dimension: '데이터 활용', score: 1, max_score: 10 },
        { dimension: '업무 프로세스', score: 1, max_score: 10 },
        { dimension: '조직 역량', score: 1, max_score: 10 },
      ],
    });
    const skills = [
      '생성형 AI 활용 (ChatGPT, Claude, Gemini 등)',
      '프롬프트 엔지니어링',
      'AI 코딩 도구 (클로드코드, 코덱스, 안티그래비티, 커서AI 등)',
      '데이터 수집/정제',
      '데이터 시각화',
      '업무 자동화 (RPA/노코드)',
      '변화관리/내재화',
      'AI 전략/거버넌스',
    ];
    const result = calculateSkillScore(skills, scores);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it('dimension_scores가 undefined이면 약점 매칭 0개', () => {
    const scores: SelfAssessmentScore = {
      total_score: 50,
      max_possible_score: 100,
      dimension_scores: undefined as unknown as SelfAssessmentScore['dimension_scores'],
    };
    const result = calculateSkillScore(
      ['생성형 AI 활용 (ChatGPT, Claude, Gemini 등)'],
      scores
    );
    // matchCount=0, skills.length=1 → 1
    expect(result.score).toBe(1);
  });

  it('매핑에 없는 스킬은 약점 매칭에 기여하지 않음', () => {
    const scores = makeAssessmentScores();
    const result = calculateSkillScore(['미지의 스킬'], scores);
    // matchCount=0, skills.length=1 → 1
    expect(result.score).toBe(1);
    expect(result.explanation).toContain('0개 매칭');
  });
});

// ============================================================================
// calculateLevelScore
// ============================================================================

describe('calculateLevelScore', () => {
  it('0개 레벨이면 0점', () => {
    const result = calculateLevelScore([]);
    expect(result.score).toBe(0);
  });

  it('레벨 수 × 4점 계산', () => {
    expect(calculateLevelScore(['BEGINNER']).score).toBe(4);
    expect(calculateLevelScore(['BEGINNER', 'INTERMEDIATE']).score).toBe(8);
    expect(calculateLevelScore(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).score).toBe(12);
  });

  it('최대 15점 상한', () => {
    const result = calculateLevelScore(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'LEADER']);
    expect(result.score).toBe(15);
  });

  it('레벨 라벨이 한국어로 매핑됨', () => {
    const result = calculateLevelScore(['BEGINNER', 'ADVANCED']);
    expect(result.explanation).toContain('입문');
    expect(result.explanation).toContain('심화');
  });

  it('알 수 없는 레벨은 원본 값 사용', () => {
    const result = calculateLevelScore(['UNKNOWN_LEVEL']);
    expect(result.explanation).toContain('UNKNOWN_LEVEL');
  });
});

// ============================================================================
// calculateExperienceScore
// ============================================================================

describe('calculateExperienceScore', () => {
  it('10년 이상이면 20점 (시니어급)', () => {
    expect(calculateExperienceScore(10).score).toBe(20);
    expect(calculateExperienceScore(15).score).toBe(20);
    expect(calculateExperienceScore(10).explanation).toContain('시니어');
  });

  it('5~9년이면 15점 (중급)', () => {
    expect(calculateExperienceScore(5).score).toBe(15);
    expect(calculateExperienceScore(9).score).toBe(15);
    expect(calculateExperienceScore(7).explanation).toContain('중급');
  });

  it('2~4년이면 10점 (주니어급)', () => {
    expect(calculateExperienceScore(2).score).toBe(10);
    expect(calculateExperienceScore(4).score).toBe(10);
    expect(calculateExperienceScore(3).explanation).toContain('주니어');
  });

  it('2년 미만이면 5점', () => {
    expect(calculateExperienceScore(1).score).toBe(5);
    expect(calculateExperienceScore(0).score).toBe(5);
  });

  it('경계값: 정확히 2, 5, 10년', () => {
    expect(calculateExperienceScore(2).score).toBe(10);
    expect(calculateExperienceScore(5).score).toBe(15);
    expect(calculateExperienceScore(10).score).toBe(20);
  });

  it('설명에 경력 연수 포함', () => {
    expect(calculateExperienceScore(7).explanation).toContain('7년');
  });
});

// ============================================================================
// generateRationale
// ============================================================================

describe('generateRationale', () => {
  it('70% 이상 달성한 기준은 strengths에 포함', () => {
    const breakdown: CandidateScore['breakdown'] = [
      { criteria: '업종 적합성', score: 15, maxScore: 20, explanation: '' },
      { criteria: '전문분야', score: 18, maxScore: 20, explanation: '' },
    ];
    const result = generateRationale(breakdown, makeProfile());
    expect(result.strengths).toContain('업종 적합성');
    expect(result.strengths).toContain('전문분야');
  });

  it('50% 미만인 기준은 improvements에 포함', () => {
    const breakdown: CandidateScore['breakdown'] = [
      { criteria: '업종 적합성', score: 5, maxScore: 20, explanation: '' },
      { criteria: '전문분야', score: 3, maxScore: 20, explanation: '' },
    ];
    const result = generateRationale(breakdown, makeProfile());
    expect(result.improvements).toContain('업종 적합성');
    expect(result.improvements).toContain('전문분야');
  });

  it('50~70% 사이 기준은 strengths에도 improvements에도 포함되지 않음', () => {
    const breakdown: CandidateScore['breakdown'] = [
      { criteria: '중간 기준', score: 12, maxScore: 20, explanation: '' },
    ];
    const result = generateRationale(breakdown, makeProfile());
    expect(result.strengths).not.toContain('중간 기준');
    expect(result.improvements).not.toContain('중간 기준');
  });

  it('strengths_constraints가 있으면 consultantNote에 포함', () => {
    const profile = makeProfile({ strengths_constraints: '이것은 강점입니다' });
    const result = generateRationale([], profile);
    expect(result.consultantNote).toBe('이것은 강점입니다');
  });

  it('100자 초과 strengths_constraints는 잘림', () => {
    const longText = 'A'.repeat(150);
    const profile = makeProfile({ strengths_constraints: longText });
    const result = generateRationale([], profile);
    expect(result.consultantNote).toHaveLength(103); // 100 + '...'
    expect(result.consultantNote?.endsWith('...')).toBe(true);
  });

  it('strengths_constraints가 빈 문자열이면 consultantNote는 undefined', () => {
    const profile = makeProfile({ strengths_constraints: '' });
    const result = generateRationale([], profile);
    expect(result.consultantNote).toBeUndefined();
  });
});

// ============================================================================
// calculateMatchingScore (통합 테스트)
// ============================================================================

describe('calculateMatchingScore', () => {
  it('모든 하위 점수를 합산하여 정규화된 점수 반환', () => {
    const profile = makeProfile();
    const criteria = makeCriteria();
    const result = calculateMatchingScore('user-1', profile, criteria);

    expect(result.userId).toBe('user-1');
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('breakdown에 6개 평가 기준 포함', () => {
    const result = calculateMatchingScore('user-1', makeProfile(), makeCriteria());

    expect(result.breakdown).toHaveLength(6);
    const criteriaNames = result.breakdown.map((b) => b.criteria);
    expect(criteriaNames).toContain('업종 적합성');
    expect(criteriaNames).toContain('세부 업종 적합성');
    expect(criteriaNames).toContain('전문분야 일치도');
    expect(criteriaNames).toContain('역량 매칭');
    expect(criteriaNames).toContain('강의 레벨 적합성');
    expect(criteriaNames).toContain('경력/가용성');
  });

  it('breakdown 각 항목의 maxScore 합계는 100', () => {
    const result = calculateMatchingScore('user-1', makeProfile(), makeCriteria());
    const totalMax = result.breakdown.reduce((sum, b) => sum + b.maxScore, 0);
    expect(totalMax).toBe(100);
  });

  it('rationale가 포함됨', () => {
    const result = calculateMatchingScore('user-1', makeProfile(), makeCriteria());
    expect(result.rationale).toBeDefined();
    expect(result.rationale.strengths).toBeInstanceOf(Array);
    expect(result.rationale.improvements).toBeInstanceOf(Array);
  });

  it('업종 완전 일치 + 고경력일 때 높은 점수', () => {
    const profile = makeProfile({
      available_industries: ['제조업'],
      sub_industries: ['자동차'],
      expertise_domains: ['AI', '데이터', '자동화', '프로세스', '혁신'],
      skill_tags: [
        '생성형 AI 활용 (ChatGPT, Claude, Gemini 등)',
        '데이터 수집/정제',
        '업무 자동화 (RPA/노코드)',
        '프로세스 개선',
      ],
      teaching_levels: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'LEADER'],
      years_of_experience: 15,
    });
    const criteria = makeCriteria();
    const result = calculateMatchingScore('user-1', profile, criteria);

    // 높은 매칭 점수 기대
    expect(result.totalScore).toBeGreaterThan(0.7);
  });

  it('업종 불일치 + 저경력일 때 낮은 점수', () => {
    const profile = makeProfile({
      available_industries: ['교육'],
      sub_industries: [],
      expertise_domains: [],
      skill_tags: [],
      teaching_levels: [],
      years_of_experience: 0,
    });
    const criteria = makeCriteria({ industry: '금융/보험' });
    const result = calculateMatchingScore('user-1', profile, criteria);

    expect(result.totalScore).toBeLessThan(0.3);
  });

  it('totalScore는 소수점 둘째 자리까지 반올림', () => {
    const result = calculateMatchingScore('user-1', makeProfile(), makeCriteria());
    // Math.round(x * 100) / 100 → 소수점 2자리
    const decimalPlaces = (result.totalScore.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
