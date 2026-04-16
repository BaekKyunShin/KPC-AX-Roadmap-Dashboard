import { describe, it, expectTypeOf } from 'vitest';
import type {
  TrainingLevel,
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlanItem,
  RoadmapAnnualPlan,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  LLMRoadmapResult,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';

describe('roadmap-types 신규 구조', () => {
  it('TrainingLevel은 BEGINNER | INTERMEDIATE | ADVANCED 유니온이다', () => {
    expectTypeOf<TrainingLevel>().toEqualTypeOf<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>();
  });

  it('RoadmapCompetency는 필수 필드를 보유한다', () => {
    expectTypeOf<RoadmapCompetency>().toMatchTypeOf<{
      name: string;
      definition: string;
      knowledge: string[];
      skills: string[];
      attitudes: string[];
      ncs_used: boolean;
    }>();
  });

  it('RoadmapCompetency의 NCS 관련 필드는 선택 필드이다', () => {
    expectTypeOf<RoadmapCompetency>().toHaveProperty('ncs_methodology');
    expectTypeOf<RoadmapCompetency>().toHaveProperty('ncs_derivation_method');
    const sample: RoadmapCompetency = {
      name: '역량',
      definition: '정의',
      knowledge: [],
      skills: [],
      attitudes: [],
      ncs_used: true,
    };
    expectTypeOf(sample.ncs_methodology).toEqualTypeOf<string | undefined>();
    expectTypeOf(sample.ncs_derivation_method).toEqualTypeOf<string | undefined>();
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

  it('LLMRoadmapResult는 4섹션을 모두 보유한다', () => {
    expectTypeOf<LLMRoadmapResult>().toMatchTypeOf<{
      diagnosis_summary: string;
      competencies: RoadmapCompetency[];
      training_structure: RoadmapTrainingStructureItem[];
      annual_plan: RoadmapAnnualPlan;
      course_specs: RoadmapCourseSpec[];
    }>();
  });

  it('RoadmapResult는 LLMRoadmapResult와 동일한 구조이다', () => {
    expectTypeOf<RoadmapResult>().toEqualTypeOf<LLMRoadmapResult>();
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
      competencies: [
        {
          name: '데이터분석',
          definition: '정의',
          knowledge: ['K1'],
          skills: ['S1'],
          attitudes: ['A1'],
          ncs_used: true,
          ncs_methodology: 'NCS 활용 방법',
        },
      ],
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
