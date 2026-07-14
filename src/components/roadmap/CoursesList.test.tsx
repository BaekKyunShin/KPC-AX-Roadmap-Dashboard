import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CoursesList } from './CoursesList';
import type { RoadmapCourseSpec } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터 (산인공 양식 v2 — 명세서 6개 기준)
// ============================================================================

function makeSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: '과정 A',
    training_method: '집체',
    recommended_program: '내일배움카드',
    goal: '기본 역량 확보',
    main_content: '이론 + 실습',
    target_audience: '실무자',
    subjects: [{ name: '기초', details: '소개', hours: 4 }],
    ...overrides,
  };
}

function makeSpecs(count: number): RoadmapCourseSpec[] {
  return Array.from({ length: count }, (_, i) => makeSpec({ course_name: `과정 ${i + 1}` }));
}

// ============================================================================
// 테스트
// ============================================================================

describe('CoursesList', () => {
  describe('빈 상태', () => {
    it('빈 specs + canEdit=false이면 EmptyState를 표시한다', () => {
      render(<CoursesList specs={[]} canEdit={false} />);
      expect(screen.getByText('훈련과정 명세서가 없습니다.')).toBeInTheDocument();
    });

    it('빈 specs + canEdit=true이면 EmptyState 대신 추가 버튼과 경고가 표시된다', () => {
      render(<CoursesList specs={[]} canEdit={true} onChange={vi.fn()} />);
      expect(screen.queryByText('훈련과정 명세서가 없습니다.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /명세서 추가/ })).toBeInTheDocument();
    });
  });

  describe('최소 개수 경고 (v2: 6개)', () => {
    it('canEdit=true && specs.length < 6이면 경고 Alert가 표시된다', () => {
      render(<CoursesList specs={makeSpecs(5)} canEdit={true} onChange={vi.fn()} />);
      expect(screen.getByText(/최소 6개 필요/)).toBeInTheDocument();
      expect(
        screen.getByText(/산인공 양식은 최소 6개의 훈련과정 명세서를 요구합니다/)
      ).toBeInTheDocument();
    });

    it('canEdit=true && specs.length >= 6이면 경고가 표시되지 않는다', () => {
      render(<CoursesList specs={makeSpecs(6)} canEdit={true} onChange={vi.fn()} />);
      expect(screen.queryByText(/최소 6개 필요/)).not.toBeInTheDocument();
    });

    it('canEdit=false이면 경고가 표시되지 않는다 (표시 전용)', () => {
      render(<CoursesList specs={makeSpecs(1)} canEdit={false} />);
      expect(screen.queryByText(/최소 6개 필요/)).not.toBeInTheDocument();
    });
  });

  describe('편집 동작', () => {
    it('명세서 추가 버튼 클릭 시 onChange가 specs.length+1로 호출된다 (v2 기본값 포함)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CoursesList specs={makeSpecs(3)} canEdit={true} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /명세서 추가/ }));

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCourseSpec[];
      expect(arg).toHaveLength(4);
      expect(arg[3].course_name).toBe('');
      expect(arg[3].subjects).toEqual([]);
      // v2 신규 필드 기본값
      expect(arg[3].training_period).toBe('');
      expect(arg[3].training_level).toBe('BEGINNER');
      expect(arg[3].training_method).toBe('');
    });

    it('카드의 onDelete 호출 시 onChange가 specs.length-1로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CoursesList specs={makeSpecs(3)} canEdit={true} onChange={onChange} />);

      const deleteBtn = screen.getByRole('button', { name: /명세서 1 삭제/ });
      await user.click(deleteBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCourseSpec[];
      expect(arg).toHaveLength(2);
      expect(arg[0].course_name).toBe('과정 2');
      expect(arg[1].course_name).toBe('과정 3');
    });

    it('카드의 onChange 호출 시 상위 onChange가 해당 인덱스만 교체된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CoursesList
          specs={makeSpecs(3).map((s) => ({ ...s, training_method: '' }))}
          canEdit={true}
          onChange={onChange}
        />
      );

      const methodInput = screen.getByLabelText(/명세서 1 훈련방법/);
      await user.type(methodInput, '집');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapCourseSpec[];
      expect(lastArg).toHaveLength(3);
      expect(lastArg[0].training_method).toBe('집');
      expect(lastArg[1].training_method).toBe('');
    });
  });

  describe('렌더링', () => {
    it('각 명세서가 인덱스 배지와 함께 렌더링된다', () => {
      render(<CoursesList specs={makeSpecs(2)} canEdit={false} />);
      expect(screen.getByText('명세서 #1')).toBeInTheDocument();
      expect(screen.getByText('명세서 #2')).toBeInTheDocument();
      expect(screen.getByText('과정 1')).toBeInTheDocument();
      expect(screen.getByText('과정 2')).toBeInTheDocument();
    });

    it('6개 명세서를 모두 렌더링한다 (v2 양식 기준)', () => {
      render(<CoursesList specs={makeSpecs(6)} canEdit={false} />);
      expect(screen.getByText('명세서 #6')).toBeInTheDocument();
      expect(screen.getByText('과정 6')).toBeInTheDocument();
    });
  });
});
