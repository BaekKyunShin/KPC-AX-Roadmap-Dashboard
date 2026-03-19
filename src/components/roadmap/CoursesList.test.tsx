import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CoursesList } from './CoursesList';
import type { RoadmapCell, CurriculumModule } from '@/lib/services/roadmap';

// ============================================================================
// 테스트 데이터 헬퍼
// ============================================================================

function makeCurriculumModule(overrides: Partial<CurriculumModule> = {}): CurriculumModule {
  return {
    module_name: 'AI 개론',
    hours: 4,
    details: ['AI 기본 개념 학습', '머신러닝 개요'],
    practice: '간단한 AI 모델 실행',
    ...overrides,
  };
}

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: 'AI 기초 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '신입 직원',
    recommended_hours: 16,
    curriculum: [makeCurriculumModule()],
    tools: [{ name: 'Google Colab', free_tier_info: '무료 사용 가능' }],
    expected_outcome: 'AI 기초 역량 확보',
    measurement_method: '실습 결과물 평가',
    prerequisites: ['PC', '인터넷'],
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('CoursesList', () => {
  describe('빈 상태', () => {
    it('courses가 빈 배열이면 빈 상태 메시지를 표시한다', () => {
      render(<CoursesList courses={[]} />);
      expect(screen.getByText('과정 데이터가 없습니다.')).toBeInTheDocument();
    });

    it('courses가 undefined이면 빈 상태 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<CoursesList courses={undefined as any} />);
      expect(screen.getByText('과정 데이터가 없습니다.')).toBeInTheDocument();
    });

    it('courses가 null이면 빈 상태 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<CoursesList courses={null as any} />);
      expect(screen.getByText('과정 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('과정 카드 렌더링', () => {
    it('과정명을 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      // 과정명은 카드 헤더(h3)와 프로파일 테이블에 모두 표시됨
      const elements = screen.getAllByText('AI 기초 과정');
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // h3 헤더에 과정명이 표시되는지 확인
      const heading = screen.getByRole('heading', { level: 3, name: 'AI 기초 과정' });
      expect(heading).toBeInTheDocument();
    });

    it('대상 업무를 배지로 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ target_task: '품질 관리' })]} />);
      // 대상 업무는 카드 헤더 배지와 프로파일 테이블에 모두 표시됨
      const elements = screen.getAllByText('품질 관리');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('교육 시간을 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ recommended_hours: 24 })]} />);
      // 교육 시간은 카드 헤더 배지와 프로파일 테이블에 모두 표시됨
      const elements = screen.getAllByText(/24시간/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('여러 과정을 렌더링한다', () => {
      const courses = [
        makeCourse({ course_name: '과정 A' }),
        makeCourse({ course_name: '과정 B' }),
        makeCourse({ course_name: '과정 C' }),
      ];
      render(<CoursesList courses={courses} />);
      expect(screen.getAllByText('과정 A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('과정 B').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('과정 C').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('레벨 배지', () => {
    it('BEGINNER 레벨은 "초급"으로 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ level: 'BEGINNER' })]} />);
      // 과정 프로파일 테이블 + 카드 헤더에 표시
      expect(screen.getAllByText('초급').length).toBeGreaterThanOrEqual(1);
    });

    it('INTERMEDIATE 레벨은 "중급"으로 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ level: 'INTERMEDIATE' })]} />);
      expect(screen.getAllByText('중급').length).toBeGreaterThanOrEqual(1);
    });

    it('ADVANCED 레벨은 "고급"으로 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ level: 'ADVANCED' })]} />);
      expect(screen.getAllByText('고급').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('과정 프로파일 섹션', () => {
    it('과정 프로파일 아코디언 트리거를 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('과정 프로파일')).toBeInTheDocument();
    });

    it('교육 대상을 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ target_audience: '중간 관리자' })]} />);
      expect(screen.getByText('중간 관리자')).toBeInTheDocument();
    });

    it('사용 도구를 배지로 표시한다', () => {
      const course = makeCourse({
        tools: [
          { name: 'Google Colab', free_tier_info: '무료' },
          { name: 'Python', free_tier_info: '오픈소스' },
        ],
      });
      render(<CoursesList courses={[course]} />);
      expect(screen.getByText('Google Colab')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    it('선수 조건을 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ prerequisites: ['노트북', '파이썬 기초'] })]} />);
      expect(screen.getByText('노트북, 파이썬 기초')).toBeInTheDocument();
    });

    it('선수 조건이 없으면 "없음"을 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ prerequisites: [] })]} />);
      expect(screen.getByText('없음')).toBeInTheDocument();
    });
  });

  describe('커리큘럼 섹션', () => {
    it('커리큘럼 아코디언 트리거를 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('커리큘럼')).toBeInTheDocument();
    });

    it('모듈 개수 배지를 표시한다', () => {
      const course = makeCourse({
        curriculum: [
          makeCurriculumModule({ module_name: '모듈 1' }),
          makeCurriculumModule({ module_name: '모듈 2' }),
          makeCurriculumModule({ module_name: '모듈 3' }),
        ],
      });
      render(<CoursesList courses={[course]} />);
      expect(screen.getByText('3개 모듈')).toBeInTheDocument();
    });

    it('모듈명을 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('AI 개론')).toBeInTheDocument();
    });

    it('모듈 시간을 "H" 포맷으로 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('4H')).toBeInTheDocument();
    });

    it('모듈 세부 내용을 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('AI 기본 개념 학습')).toBeInTheDocument();
      expect(screen.getByText('머신러닝 개요')).toBeInTheDocument();
    });

    it('실습/과제 내용을 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('간단한 AI 모델 실행')).toBeInTheDocument();
    });

    it('실습 내용이 없으면 "-"를 표시한다', () => {
      const course = makeCourse({
        curriculum: [makeCurriculumModule({ practice: '' })],
      });
      render(<CoursesList courses={[course]} />);
      // practice가 빈 문자열이면 falsy이므로 "-" 표시
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('커리큘럼이 빈 배열이면 안내 메시지를 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ curriculum: [] })]} />);
      expect(screen.getByText('커리큘럼 정보가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('기대효과 및 측정방법 섹션', () => {
    it('기대효과 및 측정방법 아코디언 트리거를 표시한다', () => {
      render(<CoursesList courses={[makeCourse()]} />);
      expect(screen.getByText('기대효과 및 측정방법')).toBeInTheDocument();
    });

    it('기대효과를 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ expected_outcome: 'AI 역량 30% 향상' })]} />);
      // 기대효과는 프로파일 테이블과 기대효과 테이블에 모두 표시됨
      const elements = screen.getAllByText('AI 역량 30% 향상');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('측정 방법을 표시한다', () => {
      render(<CoursesList courses={[makeCourse({ measurement_method: '사전/사후 테스트' })]} />);
      expect(screen.getByText('사전/사후 테스트')).toBeInTheDocument();
    });
  });

  describe('편집 버튼', () => {
    it('canEdit이 false이면 편집 버튼을 표시하지 않는다', () => {
      render(<CoursesList courses={[makeCourse()]} canEdit={false} />);
      expect(screen.queryByTitle('편집')).not.toBeInTheDocument();
    });

    it('canEdit이 true이고 onEditCourse가 있으면 편집 버튼을 표시한다', () => {
      const onEditCourse = vi.fn();
      render(<CoursesList courses={[makeCourse()]} canEdit={true} onEditCourse={onEditCourse} />);
      expect(screen.getByTitle('편집')).toBeInTheDocument();
    });

    it('편집 버튼 클릭 시 onEditCourse를 과정 인덱스와 함께 호출한다', async () => {
      const user = userEvent.setup();
      const onEditCourse = vi.fn();
      render(<CoursesList courses={[makeCourse()]} canEdit={true} onEditCourse={onEditCourse} />);

      await user.click(screen.getByTitle('편집'));
      expect(onEditCourse).toHaveBeenCalledWith(0);
    });

    it('여러 과정에서 각각의 편집 버튼이 올바른 인덱스를 전달한다', async () => {
      const user = userEvent.setup();
      const onEditCourse = vi.fn();
      const courses = [
        makeCourse({ course_name: '과정 A' }),
        makeCourse({ course_name: '과정 B' }),
      ];
      render(<CoursesList courses={courses} canEdit={true} onEditCourse={onEditCourse} />);

      const editButtons = screen.getAllByTitle('편집');
      await user.click(editButtons[1]);
      expect(onEditCourse).toHaveBeenCalledWith(1);
    });

    it('canEdit 기본값은 false이다', () => {
      const onEditCourse = vi.fn();
      render(<CoursesList courses={[makeCourse()]} onEditCourse={onEditCourse} />);
      expect(screen.queryByTitle('편집')).not.toBeInTheDocument();
    });
  });
});
