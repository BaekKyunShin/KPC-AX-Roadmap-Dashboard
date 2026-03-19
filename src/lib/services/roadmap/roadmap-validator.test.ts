/**
 * roadmap-validator.ts 테스트 (~40 케이스)
 *
 * validateRoadmap(result) 함수의 내부 검증 로직을 체계적으로 검증합니다:
 * - free_tier_info 검증 (유료 키워드 탐지)
 * - course hours 검증 (MAX_COURSE_HOURS 초과, 모듈합계 불일치)
 * - PBL hours 검증 (total_hours 초과, 모듈합계 불일치)
 * - PBL course selection 검증 (레벨 불일치, 과정명 없음)
 * - PBL selection rationale / detail fields 검증
 * - 필수 필드 검증 (diagnosis_summary, roadmap_matrix, pbl_course)
 * - 통합 시나리오 및 에지 케이스
 */

import { describe, it, expect } from 'vitest';
import { validateRoadmap } from './roadmap-validator';
import type {
  RoadmapCell,
  PBLCourse,
  PBLCurriculumModule,
  RoadmapResult,
  RoadmapRow,
  CurriculumModule,
} from './roadmap-types';
import { MAX_COURSE_HOURS, PAID_TOOL_KEYWORDS } from '@/lib/utils/roadmap';

// ============================================================================
// 팩토리 함수
// ============================================================================

function makeModule(overrides: Partial<CurriculumModule> = {}): CurriculumModule {
  return {
    module_name: '모듈',
    hours: 8,
    details: ['상세1'],
    practice: '실습',
    ...overrides,
  };
}

function makePBLModule(overrides: Partial<PBLCurriculumModule> = {}): PBLCurriculumModule {
  return {
    module_name: '모듈',
    hours: 8,
    details: ['상세1'],
    practice: '실습',
    deliverables: ['산출물1'],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료: 일 제한 있음' }],
    ...overrides,
  };
}

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: '테스트 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '전 직원',
    recommended_hours: 24,
    curriculum: [makeModule({ hours: 8 }), makeModule({ hours: 8 }), makeModule({ hours: 8 })],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료: 일 제한 있음' }],
    expected_outcome: '업무 효율화',
    measurement_method: '처리 시간 비교',
    prerequisites: ['노트북'],
    ...overrides,
  };
}

function makePBLCourse(overrides: Partial<PBLCourse> = {}): PBLCourse {
  return {
    selected_course_name: '테스트 과정',
    selected_course_level: 'BEGINNER',
    selected_course_task: '데이터 분석',
    selection_rationale: {
      consultant_expertise_fit: '컨설턴트 전문성 적합',
      pain_point_alignment: '페인포인트 연관',
      feasibility_assessment: '현실 가능성 충분',
      summary: '종합 선정 이유 요약',
    },
    course_name: 'PBL: 테스트 과정',
    total_hours: 24,
    target_tasks: ['데이터 분석'],
    target_audience: '전 직원',
    curriculum: [
      makePBLModule({ module_name: '모듈1', hours: 8 }),
      makePBLModule({ module_name: '모듈2', hours: 8 }),
      makePBLModule({ module_name: '모듈3', hours: 8 }),
    ],
    final_deliverables: ['최종 결과물'],
    expected_outcomes: ['기대 효과'],
    business_impact: '비즈니스 임팩트 설명',
    measurement_methods: ['측정 방법'],
    prerequisites: ['준비물'],
    ...overrides,
  };
}

function makeRow(overrides: Partial<RoadmapRow> = {}): RoadmapRow {
  return {
    task_id: 'task_1',
    task_name: '데이터 분석',
    beginner: [{ course_name: '테스트 과정', recommended_hours: 24 }],
    intermediate: [],
    advanced: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<RoadmapResult> = {}): RoadmapResult {
  return {
    diagnosis_summary: '기업 AI 활용 진단 요약',
    roadmap_matrix: [makeRow()],
    courses: [makeCourse()],
    pbl_course: makePBLCourse(),
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('validateRoadmap', () => {
  // --------------------------------------------------------------------------
  // 완전한 유효 입력
  // --------------------------------------------------------------------------
  describe('완전히 유효한 로드맵', () => {
    it('모든 필드가 올바르면 isValid: true, 에러/경고 없음', () => {
      const result = validateRoadmap(makeResult());

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('여러 과정과 완전한 PBL이 있어도 에러/경고 없음', () => {
      const courses = [
        makeCourse({ course_name: '과정A', level: 'BEGINNER', target_task: '업무A' }),
        makeCourse({ course_name: '과정B', level: 'INTERMEDIATE', target_task: '업무B' }),
      ];
      const pbl = makePBLCourse({
        selected_course_name: '과정A',
        selected_course_level: 'BEGINNER',
        selected_course_task: '업무A',
      });
      const result = validateRoadmap(makeResult({ courses, pbl_course: pbl }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // free_tier_info 검증
  // --------------------------------------------------------------------------
  describe('무료 도구 정책 검증 (free_tier_info)', () => {
    it('과정 도구의 free_tier_info가 빈 문자열이면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'SomeTool', free_tier_info: '' }],
            }),
          ],
        })
      );

      expect(result.errors).toContain('무료 범위 미표기: SomeTool (테스트 과정)');
    });

    it('과정 도구의 free_tier_info가 공백만이면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'WhitespaceTool', free_tier_info: '   ' }],
            }),
          ],
        })
      );

      expect(result.errors).toContain('무료 범위 미표기: WhitespaceTool (테스트 과정)');
    });

    it.each(
      PAID_TOOL_KEYWORDS.map(kw => [kw])
    )('유료 키워드 "%s"를 감지하면 에러를 추가한다', keyword => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'PaidTool', free_tier_info: `${keyword} 포함` }],
            }),
          ],
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: PaidTool'))).toBe(true);
    });

    it('유료 키워드 대소문자를 무시하여 감지한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'MixedCase', free_tier_info: 'PREMIUM tier' }],
            }),
          ],
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: MixedCase'))).toBe(true);
    });

    it('정상적인 free_tier_info는 에러를 추가하지 않는다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'FreeTool', free_tier_info: '완전 무료, 기능 제한 없음' }],
            }),
          ],
        })
      );

      expect(result.errors.filter(e => e.includes('FreeTool'))).toHaveLength(0);
    });

    it('PBL 커리큘럼 도구에서 유료 키워드를 감지한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({
                tools: [{ name: 'ExpensiveTool', free_tier_info: '유료 전용' }],
              }),
            ],
          }),
        })
      );

      expect(
        result.errors.some(e => e.includes('유료 도구 사용 감지: ExpensiveTool'))
      ).toBe(true);
    });

    it('PBL 커리큘럼 도구의 free_tier_info 미표기를 감지한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({
                tools: [{ name: 'EmptyTool', free_tier_info: '' }],
              }),
            ],
          }),
        })
      );

      expect(result.errors.some(e => e.includes('무료 범위 미표기: EmptyTool'))).toBe(true);
    });

    it('tools 배열이 undefined인 과정은 도구 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({ tools: undefined as unknown as RoadmapCell['tools'] }),
          ],
        })
      );

      const toolErrors = result.errors.filter(
        e => e.includes('미표기') || e.includes('유료 도구')
      );
      expect(toolErrors).toHaveLength(0);
    });

    it('PBL curriculum이 undefined이면 PBL 도구 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: undefined as unknown as PBLCurriculumModule[],
          }),
        })
      );

      expect(result.errors.filter(e => e.includes('유료 도구'))).toHaveLength(0);
    });

    it('여러 과정의 도구를 모두 검증한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '과정A',
              tools: [{ name: 'ToolA', free_tier_info: '유료' }],
            }),
            makeCourse({
              course_name: '과정B',
              tools: [{ name: 'ToolB', free_tier_info: '' }],
            }),
          ],
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: ToolA'))).toBe(true);
      expect(result.errors.some(e => e.includes('무료 범위 미표기: ToolB (과정B)'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // course hours 검증
  // --------------------------------------------------------------------------
  describe('과정별 시간 검증 (course hours)', () => {
    it(`recommended_hours > ${MAX_COURSE_HOURS}이면 에러를 추가한다`, () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: MAX_COURSE_HOURS + 1 })],
        })
      );

      expect(result.errors.some(e => e.includes('시간 초과'))).toBe(true);
    });

    it(`recommended_hours = ${MAX_COURSE_HOURS}이면 시간 초과 에러 없음`, () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              recommended_hours: MAX_COURSE_HOURS,
              curriculum: [makeModule({ hours: 20 }), makeModule({ hours: 20 })],
            }),
          ],
        })
      );

      expect(result.errors.filter(e => e.includes('시간 초과'))).toHaveLength(0);
    });

    it('recommended_hours와 모듈 시간 합계가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              recommended_hours: 30,
              curriculum: [makeModule({ hours: 10 }), makeModule({ hours: 10 })],
            }),
          ],
        })
      );

      expect(result.warnings.some(w => w.includes('시간 불일치'))).toBe(true);
      expect(
        result.warnings.some(
          w => w.includes('recommended_hours(30시간)') && w.includes('모듈 시간 합계(20시간)')
        )
      ).toBe(true);
    });

    it('recommended_hours와 모듈 시간 합계가 일치하면 경고 없음', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: 24 })], // 8+8+8=24
        })
      );

      expect(result.warnings.filter(w => w.includes('시간 불일치'))).toHaveLength(0);
    });

    it('커리큘럼이 빈 배열이면 시간 불일치 경고를 건너뛴다 (modulesTotal=0)', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: 20, curriculum: [] })],
        })
      );

      expect(result.warnings.filter(w => w.includes('시간 불일치'))).toHaveLength(0);
    });

    it('시간 초과 에러 메시지에 과정명과 시간 정보가 포함된다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '긴 과정',
              recommended_hours: 50,
            }),
          ],
        })
      );

      expect(
        result.errors.some(e => e.includes('긴 과정') && e.includes('50시간'))
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // PBL hours 검증
  // --------------------------------------------------------------------------
  describe('PBL 시간 검증 (PBL hours)', () => {
    it(`total_hours > ${MAX_COURSE_HOURS}이면 에러를 추가한다`, () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: MAX_COURSE_HOURS + 1 }),
        })
      );

      expect(result.errors.some(e => e.includes('PBL 과정 시간 초과'))).toBe(true);
    });

    it(`모듈 합계 > ${MAX_COURSE_HOURS}이면 에러를 추가한다`, () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            total_hours: 10,
            curriculum: [
              makePBLModule({ hours: 25 }),
              makePBLModule({ hours: 20 }),
            ],
          }),
        })
      );

      expect(result.errors.some(e => e.includes('PBL 모듈 합계 시간 초과'))).toBe(true);
    });

    it('total_hours와 모듈 합계가 동시에 초과하면 두 에러 모두 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            total_hours: 50,
            curriculum: [makePBLModule({ hours: 30 }), makePBLModule({ hours: 25 })],
          }),
        })
      );

      expect(result.errors.some(e => e.includes('PBL 과정 시간 초과'))).toBe(true);
      expect(result.errors.some(e => e.includes('PBL 모듈 합계 시간 초과'))).toBe(true);
    });

    it('total_hours와 모듈 합계가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: 30 }), // 모듈 합계: 24 (8+8+8)
        })
      );

      expect(result.warnings.some(w => w.includes('PBL 시간 불일치'))).toBe(true);
      expect(
        result.warnings.some(
          w => w.includes('total_hours(30시간)') && w.includes('모듈 합계(24시간)')
        )
      ).toBe(true);
    });

    it('total_hours와 모듈 합계가 일치하면 경고 없음', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: 24 }), // 8+8+8=24
        })
      );

      expect(result.warnings.filter(w => w.includes('PBL 시간 불일치'))).toHaveLength(0);
    });

    it('PBL curriculum이 빈 배열이면 시간 불일치 경고를 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: 20, curriculum: [] }),
        })
      );

      expect(result.warnings.filter(w => w.includes('PBL 시간 불일치'))).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // PBL course selection 검증
  // --------------------------------------------------------------------------
  describe('PBL 과정 선정 검증 (PBL course selection)', () => {
    it('과정명+레벨+업무가 정확히 일치하면 에러/경고 없음', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: 'AI 분석 과정',
              level: 'INTERMEDIATE',
              target_task: '데이터 분석',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: 'AI 분석 과정',
            selected_course_level: 'INTERMEDIATE',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(result.errors.filter(e => e.includes('PBL 선정'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('PBL 선정'))).toHaveLength(0);
    });

    it('selected_course_name이 빈 문자열이면 에러를 추가하고 추가 검증을 하지 않는다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ selected_course_name: '' }),
        })
      );

      expect(
        result.errors.some(e => e.includes('PBL 과정에 선정된 과정명'))
      ).toBe(true);
      // 빈 과정명이므로 "존재하지 않습니다" 에러는 발생하지 않아야 함 (early return)
      expect(
        result.errors.filter(e => e.includes('존재하지 않습니다'))
      ).toHaveLength(0);
    });

    it('과정명은 일치하지만 레벨이 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '과정X',
              level: 'ADVANCED',
              target_task: '데이터 분석',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: '과정X',
            selected_course_level: 'BEGINNER',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('레벨 또는 업무가 일치하지 않습니다'))
      ).toBe(true);
    });

    it('과정명은 일치하지만 업무가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '과정Y',
              level: 'BEGINNER',
              target_task: '보고서 작성',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: '과정Y',
            selected_course_level: 'BEGINNER',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('레벨 또는 업무가 일치하지 않습니다'))
      ).toBe(true);
    });

    it('selected_course_name이 courses에 전혀 없으면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ course_name: '다른 과정' })],
          pbl_course: makePBLCourse({ selected_course_name: '존재하지 않는 과정' }),
        })
      );

      expect(
        result.errors.some(
          e => e.includes('존재하지 않는 과정') && e.includes('존재하지 않습니다')
        )
      ).toBe(true);
    });

    it('경고 메시지에 선정과 실제의 레벨/업무 정보가 포함된다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '과정Z',
              level: 'ADVANCED',
              target_task: '품질 관리',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: '과정Z',
            selected_course_level: 'BEGINNER',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(
        result.warnings.some(
          w =>
            w.includes('선정: BEGINNER/데이터 분석') &&
            w.includes('실제: ADVANCED/품질 관리')
        )
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // PBL selection rationale 검증
  // --------------------------------------------------------------------------
  describe('PBL 선정 이유 검증 (selection_rationale)', () => {
    it('selection_rationale가 없으면(falsy) 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: undefined as unknown as PBLCourse['selection_rationale'],
          }),
        })
      );

      expect(
        result.errors.some(e => e.includes('선정 이유(selection_rationale)가 없습니다'))
      ).toBe(true);
    });

    it('selection_rationale가 null이면 에러를 추가하고 하위 필드를 검사하지 않는다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: null as unknown as PBLCourse['selection_rationale'],
          }),
        })
      );

      expect(
        result.errors.some(e => e.includes('선정 이유(selection_rationale)가 없습니다'))
      ).toBe(true);
      // 하위 필드 경고 없음
      expect(result.warnings.filter(w => w.includes('전문성 적합도'))).toHaveLength(0);
    });

    it('consultant_expertise_fit이 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: {
              consultant_expertise_fit: '',
              pain_point_alignment: '관련',
              feasibility_assessment: '가능',
              summary: '요약',
            },
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('컨설턴트 전문성 적합도'))
      ).toBe(true);
    });

    it('pain_point_alignment가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: {
              consultant_expertise_fit: '적합',
              pain_point_alignment: '',
              feasibility_assessment: '가능',
              summary: '요약',
            },
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('페인포인트 연관성'))
      ).toBe(true);
    });

    it('feasibility_assessment가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: {
              consultant_expertise_fit: '적합',
              pain_point_alignment: '관련',
              feasibility_assessment: '',
              summary: '요약',
            },
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('현실 가능성 평가'))
      ).toBe(true);
    });

    it('summary가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: {
              consultant_expertise_fit: '적합',
              pain_point_alignment: '관련',
              feasibility_assessment: '가능',
              summary: '',
            },
          }),
        })
      );

      expect(result.warnings.some(w => w.includes('선정 이유 요약'))).toBe(true);
    });

    it('모든 rationale 필드가 빈 문자열이면 4개의 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            selection_rationale: {
              consultant_expertise_fit: '',
              pain_point_alignment: '',
              feasibility_assessment: '',
              summary: '',
            },
          }),
        })
      );

      const rationaleWarnings = result.warnings.filter(
        w =>
          w.includes('전문성') ||
          w.includes('페인포인트') ||
          w.includes('현실 가능성') ||
          w.includes('선정 이유 요약')
      );
      expect(rationaleWarnings).toHaveLength(4);
    });
  });

  // --------------------------------------------------------------------------
  // PBL detail fields 검증
  // --------------------------------------------------------------------------
  describe('PBL 상세 필드 검증 (detail fields)', () => {
    it('final_deliverables가 빈 배열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ final_deliverables: [] }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('최종 산출물(final_deliverables)'))
      ).toBe(true);
    });

    it('final_deliverables가 undefined이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            final_deliverables: undefined as unknown as string[],
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('최종 산출물(final_deliverables)'))
      ).toBe(true);
    });

    it('business_impact가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ business_impact: '' }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('비즈니스 임팩트(business_impact)'))
      ).toBe(true);
    });

    it('모듈에 deliverables가 빈 배열이면 해당 모듈에 대한 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({ module_name: '빈 결과물 모듈', deliverables: [] }),
            ],
          }),
        })
      );

      expect(
        result.warnings.some(
          w => w.includes('빈 결과물 모듈') && w.includes('결과물(deliverables)')
        )
      ).toBe(true);
    });

    it('모듈에 deliverables가 undefined이면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({
                module_name: 'undefined 모듈',
                deliverables: undefined as unknown as string[],
              }),
            ],
          }),
        })
      );

      expect(
        result.warnings.some(
          w => w.includes('undefined 모듈') && w.includes('결과물(deliverables)')
        )
      ).toBe(true);
    });

    it('여러 모듈에서 deliverables가 없으면 각 모듈마다 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({ module_name: '모듈A', deliverables: [] }),
              makePBLModule({ module_name: '모듈B', deliverables: ['있음'] }),
              makePBLModule({ module_name: '모듈C', deliverables: [] }),
            ],
          }),
        })
      );

      expect(result.warnings.filter(w => w.includes('결과물(deliverables)'))).toHaveLength(2);
      expect(result.warnings.some(w => w.includes('모듈A'))).toBe(true);
      expect(result.warnings.some(w => w.includes('모듈C'))).toBe(true);
    });

    it('경고 메시지에 모듈 인덱스(1-based)와 모듈명이 포함된다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              makePBLModule({ module_name: '첫번째', deliverables: ['있음'] }),
              makePBLModule({ module_name: '두번째', deliverables: [] }),
            ],
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('모듈 2') && w.includes('두번째'))
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 필수 필드 검증
  // --------------------------------------------------------------------------
  describe('필수 필드 검증', () => {
    it('diagnosis_summary가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(makeResult({ diagnosis_summary: '' }));

      expect(result.warnings).toContain('진단 요약이 비어있습니다.');
    });

    it('roadmap_matrix가 빈 배열이면 에러를 추가한다', () => {
      const result = validateRoadmap(makeResult({ roadmap_matrix: [] }));

      expect(result.errors).toContain('로드맵 매트릭스가 비어있습니다.');
      expect(result.isValid).toBe(false);
    });

    it('roadmap_matrix가 undefined이면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({ roadmap_matrix: undefined as unknown as RoadmapRow[] })
      );

      expect(result.errors).toContain('로드맵 매트릭스가 비어있습니다.');
    });

    it('pbl_course가 undefined이면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({ pbl_course: undefined as unknown as PBLCourse })
      );

      expect(result.errors).toContain('PBL 과정이 없습니다.');
      expect(result.isValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 통합 시나리오 및 에지 케이스
  // --------------------------------------------------------------------------
  describe('통합 시나리오', () => {
    it('다중 에러+경고 조합: 유료 도구 + 시간 초과 + 빈 매트릭스 + PBL 불일치', () => {
      const result = validateRoadmap(
        makeResult({
          diagnosis_summary: '',
          roadmap_matrix: [],
          courses: [
            makeCourse({
              recommended_hours: MAX_COURSE_HOURS + 10,
              tools: [{ name: 'PaidTool', free_tier_info: '유료' }],
            }),
          ],
          pbl_course: makePBLCourse({
            total_hours: 30,
            final_deliverables: [],
            business_impact: '',
          }),
        })
      );

      expect(result.isValid).toBe(false);
      // 에러: 시간 초과 + 유료 도구 + 빈 매트릭스
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      // 경고: 진단 요약 + PBL 시간 불일치 + 빈 산출물 + 빈 임팩트
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    });

    it('pbl_course가 없으면 PBL 상세 검증(선정/이유/필드)을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({ pbl_course: undefined as unknown as PBLCourse })
      );

      const pblErrors = result.errors.filter(e => e.includes('PBL'));
      expect(pblErrors).toEqual(['PBL 과정이 없습니다.']);
      // PBL 상세 관련 경고 없음
      expect(result.warnings.filter(w => w.includes('PBL'))).toHaveLength(0);
    });

    it('courses가 빈 배열이면 PBL 선정/이유/상세 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [],
          pbl_course: makePBLCourse({
            selected_course_name: '존재하지 않는 과정',
            selection_rationale: {
              consultant_expertise_fit: '',
              pain_point_alignment: '',
              feasibility_assessment: '',
              summary: '',
            },
            final_deliverables: [],
            business_impact: '',
          }),
        })
      );

      // courses.length === 0이므로 PBL 선정/이유/상세 검증 건너뜀
      expect(result.errors.filter(e => e.includes('PBL 선정'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('전문성'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('final_deliverables'))).toHaveLength(0);
    });

    it('isValid는 에러가 없을 때만 true이다 (경고만 있으면 true)', () => {
      const result = validateRoadmap(
        makeResult({ diagnosis_summary: '' })
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('빈 courses 배열은 도구/시간 검증 에러를 발생시키지 않는다', () => {
      const result = validateRoadmap(
        makeResult({ courses: [] })
      );

      expect(result.errors.filter(e => e.includes('도구') || e.includes('시간 초과'))).toHaveLength(0);
    });

    it('PBL이 없고 courses도 비어있으면 PBL 없음 에러만 발생한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [],
          pbl_course: undefined as unknown as PBLCourse,
        })
      );

      expect(result.errors).toContain('PBL 과정이 없습니다.');
      // PBL 관련 세부 에러/경고 없음
      const pblDetailErrors = result.errors.filter(
        e => e.includes('PBL 선정') || e.includes('선정 이유')
      );
      expect(pblDetailErrors).toHaveLength(0);
    });
  });
});
