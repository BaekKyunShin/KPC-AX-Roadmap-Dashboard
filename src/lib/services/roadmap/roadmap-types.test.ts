import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  TrainingLevel,
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlanItem,
  RoadmapAnnualPlan,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  RoadmapOutcomeSummary,
  LLMRoadmapResult,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';
import { TRAINING_LEVEL_LABEL } from './roadmap-types';

describe('roadmap-types 신규 구조', () => {
  it('TrainingLevel은 BEGINNER | INTERMEDIATE | ADVANCED 유니온이다', () => {
    expectTypeOf<TrainingLevel>().toEqualTypeOf<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>();
  });

  it('RoadmapCompetency는 필수 필드를 보유한다 (NCS 필드는 루트로 이동되어 제거됨)', () => {
    expectTypeOf<RoadmapCompetency>().toEqualTypeOf<{
      name: string;
      definition: string;
      knowledge: string[];
      skills: string[];
      attitudes: string[];
    }>();
  });

  it('RoadmapOutcomeSummary는 3필드 (Ⅰ-3 수립 주요 결과)', () => {
    expectTypeOf<RoadmapOutcomeSummary>().toMatchTypeOf<{
      ai_competency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      selected_tasks: string;
      main_content: string;
    }>();
  });

  it('RoadmapTrainingStructureItem은 훈련수준·내용·대상·방법·목표를 보유한다', () => {
    expectTypeOf<RoadmapTrainingStructureItem>().toMatchTypeOf<{
      competency_name: string;
      level: TrainingLevel;
      content: string;
      target_audience: string;
      method: string;
      goal: string;
    }>();
  });

  it('RoadmapAnnualPlanItem은 역량·과정명·형태·시간·비고를 보유한다', () => {
    expectTypeOf<RoadmapAnnualPlanItem>().toMatchTypeOf<{
      competency_name: string;
      course_name: string;
      format: string;
      hours: number;
      notes: string;
    }>();
  });

  it('RoadmapAnnualPlan은 items 배열과 usage_plan 텍스트를 보유한다', () => {
    expectTypeOf<RoadmapAnnualPlan>().toMatchTypeOf<{
      items: RoadmapAnnualPlanItem[];
      usage_plan: string;
    }>();
  });

  it('RoadmapCourseSubject는 과목명·세부내용·시간을 보유한다', () => {
    expectTypeOf<RoadmapCourseSubject>().toMatchTypeOf<{
      name: string;
      details: string;
      hours: number;
    }>();
  });

  it('RoadmapCourseSpec는 필수 필드와 subjects 배열을 보유한다', () => {
    expectTypeOf<RoadmapCourseSpec>().toMatchTypeOf<{
      course_name: string;
      format: string;
      recommended_program: string;
      goal: string;
      main_content: string;
      target_audience: string;
      subjects: RoadmapCourseSubject[];
    }>();
  });

  it('LLMRoadmapResult는 4섹션 + 신규 Ⅰ·Ⅲ 필드를 모두 보유한다', () => {
    expectTypeOf<LLMRoadmapResult>().toMatchTypeOf<{
      diagnosis_summary: string;
      setup_necessity: string;
      outcome_summary: RoadmapOutcomeSummary;
      competencies: RoadmapCompetency[];
      ncs_used: boolean;
      ncs_methodology: string;
      ncs_derivation_method: string;
      training_structure: RoadmapTrainingStructureItem[];
      training_structure_method: string;
      annual_plan: RoadmapAnnualPlan;
      course_specs: RoadmapCourseSpec[];
    }>();
  });

  it('RoadmapResult는 LLMRoadmapResult와 동일한 구조이다', () => {
    expectTypeOf<RoadmapResult>().toEqualTypeOf<LLMRoadmapResult>();
  });

  // R2 #15 — 훈련수준 영문 → 한글 매핑
  it('TRAINING_LEVEL_LABEL은 BEGINNER/INTERMEDIATE/ADVANCED 를 한글 초급/중급/고급 으로 매핑한다', () => {
    expect(TRAINING_LEVEL_LABEL.BEGINNER).toBe('초급');
    expect(TRAINING_LEVEL_LABEL.INTERMEDIATE).toBe('중급');
    expect(TRAINING_LEVEL_LABEL.ADVANCED).toBe('고급');
  });

  it('ValidationResult는 isValid, errors, warnings를 보유한다', () => {
    expectTypeOf<ValidationResult>().toEqualTypeOf<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>();
  });

  it('샘플 RoadmapResult 객체는 타입 검사를 통과한다', () => {
    const sample: RoadmapResult = {
      diagnosis_summary: '진단',
      setup_necessity: '수립 필요성',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks: '선정 과업',
        main_content: '수립 주요내용',
      },
      competencies: [
        {
          name: '데이터분석',
          definition: '정의',
          knowledge: ['K1'],
          skills: ['S1'],
          attitudes: ['A1'],
        },
      ],
      ncs_used: true,
      ncs_methodology: 'NCS 활용 방법',
      ncs_derivation_method: '',
      training_structure: [
        {
          competency_name: '데이터분석',
          level: 'BEGINNER',
          content: '내용',
          target_audience: '대상',
          method: '집체',
          goal: '목표',
        },
      ],
      training_structure_method: '체계 수립 방법',
      annual_plan: {
        items: [
          {
            competency_name: '데이터분석',
            course_name: '기초 과정',
            format: '집체',
            hours: 8,
            notes: '비고',
          },
        ],
        usage_plan: '활용방안',
      },
      course_specs: [
        {
          course_name: '기초 과정',
          format: '집체',
          recommended_program: '사업A',
          goal: '목표',
          main_content: '내용',
          target_audience: '대상',
          subjects: [{ name: '과목1', details: '세부', hours: 4 }],
        },
      ],
    };
    expectTypeOf(sample).toMatchTypeOf<RoadmapResult>();
  });
});
