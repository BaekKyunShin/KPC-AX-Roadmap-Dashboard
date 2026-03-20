import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PBLCourseView } from './PBLCourseView';
import type { PBLCourse } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터 팩토리
// ============================================================================

function makePBLCourse(overrides: Partial<PBLCourse> = {}): PBLCourse {
  return {
    selected_course_name: 'AI 기초 과정',
    selected_course_level: 'BEGINNER',
    selected_course_task: '데이터 분석',
    selection_rationale: {
      consultant_expertise_fit: '컨설턴트 전문성이 과정에 매우 적합합니다.',
      pain_point_alignment: '고객사의 데이터 처리 페인포인트와 연관성이 높습니다.',
      feasibility_assessment: '6개월 내 구현 가능합니다.',
      summary: '이 과정은 고객사 요구에 최적화된 선택입니다.',
    },
    course_name: 'AI 업무 자동화 PBL',
    total_hours: 40,
    target_tasks: ['데이터 분석', '보고서 자동화'],
    target_audience: '중간 관리자',
    curriculum: [
      {
        module_name: '문제 정의',
        hours: 8,
        details: ['업무 분석', '자동화 대상 선정'],
        practice: '업무 흐름 맵핑',
        deliverables: ['업무 분석 보고서'],
        tools: [{ name: 'Miro', free_tier_info: '무료 플랜 있음' }],
      },
    ],
    final_deliverables: ['자동화 파이프라인 프로토타입'],
    expected_outcomes: ['업무 처리 시간 50% 단축', '품질 향상'],
    business_impact: '연간 업무 효율성 30% 향상',
    measurement_methods: ['사전/사후 테스트', 'KPI 측정'],
    prerequisites: ['노트북', '인터넷 접속'],
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('PBLCourseView', () => {
  describe('null/undefined 처리', () => {
    it('course가 null이면 안내 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<PBLCourseView course={null as any} />);
      expect(screen.getByText('PBL 과정 데이터가 없습니다.')).toBeInTheDocument();
    });

    it('course가 undefined이면 안내 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<PBLCourseView course={undefined as any} />);
      expect(screen.getByText('PBL 과정 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('기본 정보 렌더링', () => {
    it('PBL 과정명을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('AI 업무 자동화 PBL')).toBeInTheDocument();
    });

    it('총 시간을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ total_hours: 40 })} />);
      expect(screen.getByText(/40시간/)).toBeInTheDocument();
    });

    it('교육 대상을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ target_audience: '중간 관리자' })} />);
      expect(screen.getByText(/중간 관리자/)).toBeInTheDocument();
    });
  });

  describe('선정된 과정 정보', () => {
    it('selected_course_name이 있으면 선정된 과정 섹션을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ selected_course_name: 'AI 기초 과정' })} />);
      expect(screen.getByText('선정된 과정')).toBeInTheDocument();
      expect(screen.getByText('AI 기초 과정')).toBeInTheDocument();
    });

    it('selected_course_name이 없으면 선정된 과정 섹션을 표시하지 않는다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ selected_course_name: undefined as unknown as string })}
        />
      );
      expect(screen.queryByText('선정된 과정')).not.toBeInTheDocument();
    });

    it('selected_course_level이 있으면 레벨 뱃지를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ selected_course_level: 'BEGINNER' })} />);
      expect(screen.getByText('초급')).toBeInTheDocument();
    });

    it('INTERMEDIATE 레벨은 "중급"으로 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ selected_course_level: 'INTERMEDIATE' })} />);
      expect(screen.getByText('중급')).toBeInTheDocument();
    });

    it('ADVANCED 레벨은 "고급"으로 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ selected_course_level: 'ADVANCED' })} />);
      expect(screen.getByText('고급')).toBeInTheDocument();
    });

    it('selected_course_task가 있으면 뱃지를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse({ selected_course_task: '데이터 분석' })} />);
      // selected_course_task와 target_tasks 양쪽에서 표시될 수 있으므로 getAllByText 사용
      expect(screen.getAllByText('데이터 분석').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('선정 이유 조건부 표시', () => {
    it('selection_rationale가 있으면 선정 이유 섹션을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('PBL 과정 선정 이유')).toBeInTheDocument();
    });

    it('selection_rationale가 없으면 선정 이유 섹션을 표시하지 않는다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ selection_rationale: undefined as unknown as PBLCourse['selection_rationale'] })}
        />
      );
      expect(screen.queryByText('PBL 과정 선정 이유')).not.toBeInTheDocument();
    });

    it('consultant_expertise_fit 내용을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('컨설턴트 전문성이 과정에 매우 적합합니다.')).toBeInTheDocument();
    });

    it('pain_point_alignment 내용을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(
        screen.getByText('고객사의 데이터 처리 페인포인트와 연관성이 높습니다.')
      ).toBeInTheDocument();
    });

    it('feasibility_assessment 내용을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('6개월 내 구현 가능합니다.')).toBeInTheDocument();
    });

    it('selection_rationale.summary 내용을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(
        screen.getByText('이 과정은 고객사 요구에 최적화된 선택입니다.')
      ).toBeInTheDocument();
    });
  });

  describe('대상 업무 목록', () => {
    it('target_tasks 항목들을 뱃지로 표시한다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ target_tasks: ['데이터 분석', '보고서 자동화'] })}
        />
      );
      // selected_course_task와 target_tasks 양쪽에 동일 텍스트가 나올 수 있으므로 getAllByText 사용
      expect(screen.getAllByText('데이터 분석').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('보고서 자동화').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('커리큘럼 모듈 렌더링', () => {
    it('모듈명을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('문제 정의')).toBeInTheDocument();
    });

    it('모듈 시간을 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('8시간')).toBeInTheDocument();
    });

    it('모듈 details를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('업무 분석')).toBeInTheDocument();
      expect(screen.getByText('자동화 대상 선정')).toBeInTheDocument();
    });

    it('모듈 practice를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('업무 흐름 맵핑')).toBeInTheDocument();
    });

    it('모듈 deliverables를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('업무 분석 보고서')).toBeInTheDocument();
    });

    it('모듈 tools를 표시한다', () => {
      render(<PBLCourseView course={makePBLCourse()} />);
      expect(screen.getByText('Miro')).toBeInTheDocument();
    });

    it('여러 모듈을 렌더링한다', () => {
      const course = makePBLCourse({
        curriculum: [
          {
            module_name: '모듈 1',
            hours: 4,
            details: ['내용 1'],
            practice: '실습 1',
            deliverables: [],
            tools: [],
          },
          {
            module_name: '모듈 2',
            hours: 8,
            details: ['내용 2'],
            practice: '실습 2',
            deliverables: [],
            tools: [],
          },
        ],
      });
      render(<PBLCourseView course={course} />);
      expect(screen.getByText('모듈 1')).toBeInTheDocument();
      expect(screen.getByText('모듈 2')).toBeInTheDocument();
    });
  });

  describe('최종 산출물', () => {
    it('final_deliverables가 있으면 최종 산출물 섹션을 표시한다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ final_deliverables: ['자동화 파이프라인 프로토타입'] })}
        />
      );
      expect(screen.getByText('최종 산출물')).toBeInTheDocument();
      expect(screen.getByText('자동화 파이프라인 프로토타입')).toBeInTheDocument();
    });

    it('final_deliverables가 빈 배열이면 최종 산출물 섹션을 표시하지 않는다', () => {
      render(<PBLCourseView course={makePBLCourse({ final_deliverables: [] })} />);
      expect(screen.queryByText('최종 산출물')).not.toBeInTheDocument();
    });
  });

  describe('비즈니스 임팩트', () => {
    it('business_impact가 있으면 표시한다', () => {
      render(
        <PBLCourseView course={makePBLCourse({ business_impact: '연간 업무 효율성 30% 향상' })} />
      );
      expect(screen.getByText('비즈니스 임팩트')).toBeInTheDocument();
      expect(screen.getByText('연간 업무 효율성 30% 향상')).toBeInTheDocument();
    });

    it('business_impact가 없으면 섹션을 표시하지 않는다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ business_impact: undefined as unknown as string })}
        />
      );
      expect(screen.queryByText('비즈니스 임팩트')).not.toBeInTheDocument();
    });
  });

  describe('학습 목표 및 측정 방법', () => {
    it('기대 효과 항목들을 표시한다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ expected_outcomes: ['업무 처리 시간 50% 단축', '품질 향상'] })}
        />
      );
      expect(screen.getByText('기대 효과')).toBeInTheDocument();
      expect(screen.getByText('업무 처리 시간 50% 단축')).toBeInTheDocument();
      expect(screen.getByText('품질 향상')).toBeInTheDocument();
    });

    it('측정 방법 항목들을 표시한다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ measurement_methods: ['사전/사후 테스트', 'KPI 측정'] })}
        />
      );
      expect(screen.getByText('측정 방법')).toBeInTheDocument();
      expect(screen.getByText('사전/사후 테스트')).toBeInTheDocument();
      expect(screen.getByText('KPI 측정')).toBeInTheDocument();
    });
  });

  describe('준비물', () => {
    it('prerequisites가 있으면 준비물 섹션을 표시한다', () => {
      render(
        <PBLCourseView
          course={makePBLCourse({ prerequisites: ['노트북', '인터넷 접속'] })}
        />
      );
      expect(screen.getByText('준비물')).toBeInTheDocument();
      expect(screen.getByText('노트북')).toBeInTheDocument();
      expect(screen.getByText('인터넷 접속')).toBeInTheDocument();
    });

    it('prerequisites가 빈 배열이면 준비물 섹션을 표시하지 않는다', () => {
      render(<PBLCourseView course={makePBLCourse({ prerequisites: [] })} />);
      expect(screen.queryByText('준비물')).not.toBeInTheDocument();
    });
  });
});
