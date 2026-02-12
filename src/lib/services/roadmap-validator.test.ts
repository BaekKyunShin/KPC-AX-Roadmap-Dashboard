import { describe, it, expect } from 'vitest';
import { validateRoadmap } from './roadmap';
import type { RoadmapCell, PBLCourse, RoadmapResult, RoadmapRow } from './roadmap';
import { MAX_COURSE_HOURS } from '@/lib/utils/roadmap';

// ============================================================================
// 테스트 헬퍼: 최소한의 팩토리 함수
// ============================================================================

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: '테스트 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '전 직원',
    recommended_hours: 24,
    curriculum: [
      { module_name: '모듈1', hours: 8, details: ['상세1'], practice: '실습1' },
      { module_name: '모듈2', hours: 8, details: ['상세2'], practice: '실습2' },
      { module_name: '모듈3', hours: 8, details: ['상세3'], practice: '실습3' },
    ],
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
      consultant_expertise_fit: '적합',
      pain_point_alignment: '관련',
      feasibility_assessment: '가능',
      summary: '요약',
    },
    course_name: 'PBL: 테스트 과정',
    total_hours: 24,
    target_tasks: ['데이터 분석'],
    target_audience: '전 직원',
    curriculum: [
      {
        module_name: '모듈1',
        hours: 8,
        details: ['상세1'],
        practice: '실습1',
        deliverables: ['결과물1'],
        tools: [{ name: 'ChatGPT', free_tier_info: '무료' }],
      },
      {
        module_name: '모듈2',
        hours: 8,
        details: ['상세2'],
        practice: '실습2',
        deliverables: ['결과물2'],
        tools: [{ name: 'Google Sheets', free_tier_info: '무료' }],
      },
      {
        module_name: '모듈3',
        hours: 8,
        details: ['상세3'],
        practice: '실습3',
        deliverables: ['결과물3'],
        tools: [{ name: 'Notion', free_tier_info: '무료' }],
      },
    ],
    final_deliverables: ['최종 결과물'],
    expected_outcomes: ['기대 효과'],
    business_impact: '비즈니스 임팩트',
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
// validateRoadmap — 유효한 입력
// ============================================================================

describe('validateRoadmap', () => {
  describe('유효한 결과', () => {
    it('모든 필드가 올바르면 isValid: true, 에러/경고 없음', () => {
      const result = validateRoadmap(makeResult());

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // ============================================================================
  // validateToolFreeTier — 무료 도구 정책 검증
  // ============================================================================

  describe('도구 무료 정책 검증 (validateToolFreeTier)', () => {
    it('free_tier_info가 비어있으면 에러를 추가한다', () => {
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

    it('free_tier_info가 공백만이면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'SomeTool', free_tier_info: '   ' }],
            }),
          ],
        })
      );

      expect(result.errors).toContain('무료 범위 미표기: SomeTool (테스트 과정)');
    });

    it.each([
      ['구독 필요', '구독 필요'],
      ['유료', '유료 플랜만'],
      ['결제', '결제 후 사용'],
      ['paid', 'paid plan only'],
      ['premium', 'premium 전용'],
      ['pro 버전', 'pro 버전 필요'],
    ])('유료 키워드 "%s"를 감지하면 에러를 추가한다', (_, freeTierInfo) => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'PaidTool', free_tier_info: freeTierInfo }],
            }),
          ],
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: PaidTool'))).toBe(true);
    });

    it('유료 키워드 대소문자를 무시한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'Tool', free_tier_info: 'PREMIUM tier' }],
            }),
          ],
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: Tool'))).toBe(true);
    });

    it('정상적인 free_tier_info는 에러 없음', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              tools: [{ name: 'ChatGPT', free_tier_info: '무료: GPT-3.5 무제한' }],
            }),
          ],
        })
      );

      expect(result.errors.filter(e => e.includes('ChatGPT'))).toHaveLength(0);
    });
  });

  // ============================================================================
  // validateCourseTools — 과정별 도구 검증
  // ============================================================================

  describe('과정별 도구 검증 (validateCourseTools)', () => {
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

      // 유료 도구 에러 메시지에는 tool.name + free_tier_info가 포함
      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: ToolA'))).toBe(true);
      // 미표기 에러 메시지에는 tool.name + contextName(course_name)이 포함
      expect(result.errors.some(e => e.includes('ToolB') && e.includes('과정B'))).toBe(true);
    });

    it('tools가 없는 과정은 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({ tools: undefined as unknown as RoadmapCell['tools'] }),
          ],
        })
      );

      // 도구 관련 에러가 없어야 함
      expect(result.errors.filter(e => e.includes('도구') || e.includes('미표기')).length).toBe(0);
    });
  });

  // ============================================================================
  // validatePBLTools — PBL 도구 검증
  // ============================================================================

  describe('PBL 도구 검증 (validatePBLTools)', () => {
    it('PBL 커리큘럼 도구에서 유료 키워드를 감지한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              {
                module_name: 'PBL 모듈',
                hours: 8,
                details: ['상세'],
                practice: '실습',
                deliverables: ['결과물'],
                tools: [{ name: 'ExpensiveTool', free_tier_info: '유료 전용' }],
              },
            ],
          }),
        })
      );

      expect(result.errors.some(e => e.includes('유료 도구 사용 감지: ExpensiveTool'))).toBe(
        true
      );
    });

    it('PBL에 커리큘럼이 없으면 도구 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: undefined as unknown as PBLCourse['curriculum'],
          }),
        })
      );

      // PBL 도구 관련 에러 없음 (다른 에러는 있을 수 있음)
      expect(result.errors.filter(e => e.includes('유료 도구')).length).toBe(0);
    });
  });

  // ============================================================================
  // validateCourseHours — 과정별 시간 검증
  // ============================================================================

  describe('과정별 시간 검증 (validateCourseHours)', () => {
    it(`recommended_hours > ${MAX_COURSE_HOURS}이면 에러를 추가한다`, () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: MAX_COURSE_HOURS + 1 })],
        })
      );

      expect(result.errors.some(e => e.includes('시간 초과'))).toBe(true);
    });

    it(`recommended_hours = ${MAX_COURSE_HOURS}이면 에러 없음`, () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              recommended_hours: MAX_COURSE_HOURS,
              curriculum: [
                { module_name: 'M1', hours: 20, details: [], practice: '' },
                { module_name: 'M2', hours: 20, details: [], practice: '' },
              ],
            }),
          ],
        })
      );

      expect(result.errors.filter(e => e.includes('시간 초과')).length).toBe(0);
    });

    it('recommended_hours와 모듈 시간 합계가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              recommended_hours: 20,
              curriculum: [
                { module_name: 'M1', hours: 8, details: [], practice: '' },
                { module_name: 'M2', hours: 8, details: [], practice: '' },
              ],
            }),
          ],
        })
      );

      expect(result.warnings.some(w => w.includes('시간 불일치'))).toBe(true);
    });

    it('recommended_hours와 모듈 시간 합계가 같으면 경고 없음', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: 24 })], // 8+8+8=24
        })
      );

      expect(result.warnings.filter(w => w.includes('시간 불일치')).length).toBe(0);
    });

    it('커리큘럼이 비어있으면 시간 불일치 경고를 하지 않는다 (modulesTotal=0)', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ recommended_hours: 20, curriculum: [] })],
        })
      );

      expect(result.warnings.filter(w => w.includes('시간 불일치')).length).toBe(0);
    });
  });

  // ============================================================================
  // validatePBLHours — PBL 시간 검증
  // ============================================================================

  describe('PBL 시간 검증 (validatePBLHours)', () => {
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
              {
                module_name: 'M1',
                hours: 25,
                details: [],
                practice: '',
                deliverables: ['d'],
                tools: [{ name: 'T', free_tier_info: '무료' }],
              },
              {
                module_name: 'M2',
                hours: 20,
                details: [],
                practice: '',
                deliverables: ['d'],
                tools: [{ name: 'T', free_tier_info: '무료' }],
              },
            ],
          }),
        })
      );

      expect(result.errors.some(e => e.includes('PBL 모듈 합계 시간 초과'))).toBe(true);
    });

    it('total_hours와 모듈 합계가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: 30 }), // 실제 모듈 합계 24
        })
      );

      expect(result.warnings.some(w => w.includes('PBL 시간 불일치'))).toBe(true);
    });

    it('total_hours와 모듈 합계가 같으면 경고 없음', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ total_hours: 24 }), // 8+8+8=24
        })
      );

      expect(result.warnings.filter(w => w.includes('PBL 시간 불일치')).length).toBe(0);
    });
  });

  // ============================================================================
  // 필수 필드 검증
  // ============================================================================

  describe('필수 필드 검증', () => {
    it('diagnosis_summary가 빈 문자열이면 경고를 추가한다', () => {
      const result = validateRoadmap(makeResult({ diagnosis_summary: '' }));

      expect(result.warnings).toContain('진단 요약이 비어있습니다.');
    });

    it('roadmap_matrix가 비어있으면 에러를 추가한다', () => {
      const result = validateRoadmap(makeResult({ roadmap_matrix: [] }));

      expect(result.errors).toContain('로드맵 매트릭스가 비어있습니다.');
      expect(result.isValid).toBe(false);
    });

    it('pbl_course가 없으면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({ pbl_course: undefined as unknown as PBLCourse })
      );

      expect(result.errors).toContain('PBL 과정이 없습니다.');
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================================================
  // validatePBLCourseSelection — PBL 과정 선정 검증
  // ============================================================================

  describe('PBL 과정 선정 검증 (validatePBLCourseSelection)', () => {
    it('selected_course_name이 courses에서 정확히 매칭되면 에러 없음', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '테스트 과정',
              level: 'BEGINNER',
              target_task: '데이터 분석',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: '테스트 과정',
            selected_course_level: 'BEGINNER',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(result.errors.filter(e => e.includes('PBL 선정'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('PBL 선정'))).toHaveLength(0);
    });

    it('selected_course_name이 없으면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ selected_course_name: '' }),
        })
      );

      expect(
        result.errors.some(e => e.includes('PBL 과정에 선정된 과정명'))
      ).toBe(true);
    });

    it('과정명은 일치하지만 레벨/업무가 다르면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [
            makeCourse({
              course_name: '테스트 과정',
              level: 'INTERMEDIATE',
              target_task: '보고서 작성',
            }),
          ],
          pbl_course: makePBLCourse({
            selected_course_name: '테스트 과정',
            selected_course_level: 'BEGINNER',
            selected_course_task: '데이터 분석',
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('레벨 또는 업무가 일치하지 않습니다'))
      ).toBe(true);
    });

    it('selected_course_name이 courses에 없으면 에러를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          courses: [makeCourse({ course_name: '다른 과정' })],
          pbl_course: makePBLCourse({ selected_course_name: '존재하지 않는 과정' }),
        })
      );

      expect(
        result.errors.some(e => e.includes('존재하지 않는 과정') && e.includes('존재하지 않습니다'))
      ).toBe(true);
    });
  });

  // ============================================================================
  // validatePBLSelectionRationale — PBL 선정 이유 검증
  // ============================================================================

  describe('PBL 선정 이유 검증 (validatePBLSelectionRationale)', () => {
    it('selection_rationale가 없으면 에러를 추가한다', () => {
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

      expect(
        result.warnings.some(w => w.includes('선정 이유 요약'))
      ).toBe(true);
    });

    it('모든 rationale 필드가 빈 문자열이면 경고 4개를 추가한다', () => {
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

  // ============================================================================
  // validatePBLDetailFields — PBL 상세 필드 검증
  // ============================================================================

  describe('PBL 상세 필드 검증 (validatePBLDetailFields)', () => {
    it('final_deliverables가 비어있으면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({ final_deliverables: [] }),
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

    it('모듈에 deliverables가 없으면 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              {
                module_name: '빈 결과물 모듈',
                hours: 8,
                details: ['상세'],
                practice: '실습',
                deliverables: [],
                tools: [{ name: 'T', free_tier_info: '무료' }],
              },
            ],
          }),
        })
      );

      expect(
        result.warnings.some(w => w.includes('빈 결과물 모듈') && w.includes('결과물(deliverables)'))
      ).toBe(true);
    });

    it('여러 모듈에서 deliverables가 없으면 모듈마다 경고를 추가한다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: makePBLCourse({
            curriculum: [
              {
                module_name: '모듈A',
                hours: 8,
                details: [],
                practice: '',
                deliverables: [],
                tools: [{ name: 'T', free_tier_info: '무료' }],
              },
              {
                module_name: '모듈B',
                hours: 8,
                details: [],
                practice: '',
                deliverables: [],
                tools: [{ name: 'T', free_tier_info: '무료' }],
              },
            ],
          }),
        })
      );

      expect(result.warnings.filter(w => w.includes('결과물(deliverables)'))).toHaveLength(2);
    });
  });

  // ============================================================================
  // 통합 시나리오
  // ============================================================================

  describe('통합 시나리오', () => {
    it('여러 유형의 에러와 경고가 동시에 발생할 수 있다', () => {
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
            total_hours: 30, // 모듈 합계 24와 불일치
            final_deliverables: [],
            business_impact: '',
          }),
        })
      );

      expect(result.isValid).toBe(false);
      // 에러: 시간 초과 + 유료 도구 + 빈 매트릭스
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      // 경고: 빈 진단 요약 + PBL 시간 불일치 + 빈 산출물 + 빈 임팩트
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    });

    it('pbl_course가 없으면 PBL 상세 검증을 건너뛴다', () => {
      const result = validateRoadmap(
        makeResult({
          pbl_course: undefined as unknown as PBLCourse,
        })
      );

      // PBL 관련 에러는 'PBL 과정이 없습니다.'만 있어야 함
      const pblErrors = result.errors.filter(e => e.includes('PBL'));
      expect(pblErrors).toEqual(['PBL 과정이 없습니다.']);
    });

    it('courses가 비어있으면 PBL 선정/이유/상세 검증을 건너뛴다', () => {
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

      // PBL 선정 관련 에러/경고가 없어야 함 (courses가 비어있으므로 조건 분기)
      expect(result.errors.filter(e => e.includes('PBL 선정'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('전문성'))).toHaveLength(0);
    });

    it('isValid는 에러가 없을 때만 true이다 (경고만 있으면 true)', () => {
      const result = validateRoadmap(
        makeResult({
          diagnosis_summary: '', // 경고만 발생
        })
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
