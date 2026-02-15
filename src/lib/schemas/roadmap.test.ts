import { describe, it, expect } from 'vitest';
import { editRoadmapUpdatesSchema } from './roadmap';

describe('editRoadmapUpdatesSchema', () => {
  it('diagnosis_summary만 포함된 유효한 데이터 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: '진단 요약입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('빈 객체 → 실패 (수정할 항목 없음)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('diagnosis_summary가 5000자 초과 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('diagnosis_summary가 숫자 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('courses에 잘못된 level 값 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      courses: [
        {
          course_name: '과정1',
          level: 'INVALID_LEVEL',
          target_task: '업무',
          target_audience: '대상',
          recommended_hours: 8,
          curriculum: [],
          tools: [],
          expected_outcome: '효과',
          measurement_method: '측정',
          prerequisites: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('courses에 음수 recommended_hours → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      courses: [
        {
          course_name: '과정1',
          level: 'BEGINNER',
          target_task: '업무',
          target_audience: '대상',
          recommended_hours: -5,
          curriculum: [],
          tools: [],
          expected_outcome: '효과',
          measurement_method: '측정',
          prerequisites: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('유효한 courses 배열 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      courses: [
        {
          course_name: 'AI 기초',
          level: 'BEGINNER',
          target_task: '데이터 분석',
          target_audience: '신입 사원',
          recommended_hours: 16,
          curriculum: [
            {
              module_name: '모듈1',
              hours: 8,
              details: ['세부1', '세부2'],
              practice: '실습 과제',
            },
          ],
          tools: [{ name: 'Python', free_tier_info: '무료' }],
          expected_outcome: 'AI 기본 역량 확보',
          measurement_method: '실습 결과물 평가',
          prerequisites: ['노트북'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
