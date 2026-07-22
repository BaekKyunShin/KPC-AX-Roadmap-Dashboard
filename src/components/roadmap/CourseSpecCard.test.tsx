import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CourseSpecCard } from './CourseSpecCard';
import type { RoadmapCourseSpec } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터 (산인공 양식 v2 — 훈련시기·훈련수준 추가, format → training_method)
// ============================================================================

function makeSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: '생성형 AI 입문',
    training_method: '혼합',
    recommended_program: '국민내일배움카드',
    goal: '생성형 AI 도구 활용 역량 확보',
    main_content: 'ChatGPT 기초, 프롬프트 엔지니어링',
    target_audience: '전 사원',
    subjects: [
      { name: 'AI 개요', details: 'LLM 기본 개념', hours: 4 },
      { name: '실습', details: '프롬프트 작성 연습', hours: 6 },
    ],
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('CourseSpecCard', () => {
  describe('읽기 전용 모드', () => {
    it('모든 프로파일 필드와 subjects를 렌더링한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('생성형 AI 입문')).toBeInTheDocument();
      expect(screen.getByText('혼합')).toBeInTheDocument();
      expect(screen.getByText('국민내일배움카드')).toBeInTheDocument();
      expect(screen.getByText('생성형 AI 도구 활용 역량 확보')).toBeInTheDocument();
      expect(screen.getByText('ChatGPT 기초, 프롬프트 엔지니어링')).toBeInTheDocument();
      expect(screen.getByText('전 사원')).toBeInTheDocument();
      expect(screen.getByText('AI 개요')).toBeInTheDocument();
      expect(screen.getByText('실습')).toBeInTheDocument();
    });

    // --- v2 신규 필드 ---
    it('훈련시기 라벨과 값을 표시한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('훈련시기')).toBeInTheDocument();
      expect(screen.getByText('2026년 1분기')).toBeInTheDocument();
    });

    it('훈련수준 라벨과 한국어 라벨(초급)을 표시한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('훈련수준')).toBeInTheDocument();
      expect(screen.getByText('초급')).toBeInTheDocument();
    });

    it('훈련수준 INTERMEDIATE는 "중급"으로 표시된다', () => {
      render(<CourseSpecCard spec={makeSpec({ training_level: 'INTERMEDIATE' })} index={0} />);
      expect(screen.getByText('중급')).toBeInTheDocument();
    });

    it('훈련수준 ADVANCED는 "고급"으로 표시된다', () => {
      render(<CourseSpecCard spec={makeSpec({ training_level: 'ADVANCED' })} index={0} />);
      expect(screen.getByText('고급')).toBeInTheDocument();
    });

    it('훈련방법(구 훈련형태) 라벨을 표시한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('훈련방법')).toBeInTheDocument();
      expect(screen.queryByText('훈련형태')).not.toBeInTheDocument();
    });

    // --- 정본 정합: 명세서 행 라벨 붙여쓰기 (roadmap.hwpx 본문) ---
    it('훈련목표·훈련대상 라벨이 정본 문구(붙여쓰기)와 일치한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('훈련목표')).toBeInTheDocument();
      expect(screen.getByText('훈련대상')).toBeInTheDocument();
      expect(screen.queryByText('훈련 목표')).not.toBeInTheDocument();
      expect(screen.queryByText('훈련 대상')).not.toBeInTheDocument();
    });

    it('교과목 표의 시간 컬럼 헤더가 정본 문구 "훈련시간"이다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      expect(screen.getByText('훈련시간')).toBeInTheDocument();
    });

    it('명세서 인덱스 배지를 렌더링한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={2} />);
      expect(screen.getByText('명세서 #3')).toBeInTheDocument();
    });

    it('subjects 시간 합계(10H)를 정확히 표시한다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} />);
      // Accordion trigger badge 및 tfoot에 표시됨
      expect(screen.getAllByText(/10H/).length).toBeGreaterThanOrEqual(1);
    });

    it('canEdit=false면 Input/Textarea/Select/삭제 버튼이 없다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} onDelete={vi.fn()} />);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /교과목 추가/ })).not.toBeInTheDocument();
    });

    it('빈 subjects이면 "(교과목 없음)" 안내가 표시된다', () => {
      render(<CourseSpecCard spec={makeSpec({ subjects: [] })} index={0} />);
      expect(screen.getByText('(교과목 없음)')).toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('canEdit=true이면 교과목 추가 버튼이 표시된다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} canEdit={true} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /명세서 1 교과목 추가/ })).toBeInTheDocument();
    });

    it('교과목 추가 버튼 클릭 시 onChange가 subjects.length+1로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CourseSpecCard spec={makeSpec()} index={0} canEdit={true} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /명세서 1 교과목 추가/ }));

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCourseSpec;
      expect(arg.subjects).toHaveLength(3);
      expect(arg.subjects[2].name).toBe('');
      expect(arg.subjects[2].hours).toBe(0);
    });

    it('교과목 삭제 버튼 클릭 시 onChange가 subjects.length-1로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CourseSpecCard spec={makeSpec()} index={0} canEdit={true} onChange={onChange} />);

      const deleteBtn = screen.getByRole('button', {
        name: /명세서 1 교과목 1 삭제/,
      });
      await user.click(deleteBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCourseSpec;
      expect(arg.subjects).toHaveLength(1);
      expect(arg.subjects[0].name).toBe('실습');
    });

    it('프로파일 필드(훈련방법) 변경 시 onChange 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CourseSpecCard
          spec={makeSpec({ training_method: '' })}
          index={0}
          canEdit={true}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/명세서 1 훈련방법/);
      // controlled component: 단일 문자 입력으로 onChange 및 값 전달 확인
      await user.type(input, '집');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapCourseSpec;
      expect(lastArg.training_method).toBe('집');
    });

    // --- v2 신규 필드 편집 ---
    it('훈련시기 변경 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CourseSpecCard
          spec={makeSpec({ training_period: '' })}
          index={0}
          canEdit={true}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/명세서 1 훈련시기/);
      await user.type(input, '3');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapCourseSpec;
      expect(lastArg.training_period).toBe('3');
    });

    it('훈련수준은 select로 편집하며 선택 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<CourseSpecCard spec={makeSpec()} index={0} canEdit={true} onChange={onChange} />);

      const select = screen.getByLabelText(/명세서 1 훈련수준/);
      await user.selectOptions(select, 'ADVANCED');

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCourseSpec;
      expect(arg.training_level).toBe('ADVANCED');
    });

    it('훈련수준 select에 초급·중급·고급 3개 옵션이 있다', () => {
      render(<CourseSpecCard spec={makeSpec()} index={0} canEdit={true} onChange={vi.fn()} />);

      const select = screen.getByLabelText(/명세서 1 훈련수준/);
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
      expect(options).toEqual(['초급', '중급', '고급']);
    });

    it('canEdit=true && onDelete가 주어지면 카드 삭제 버튼이 표시되고 클릭 시 onDelete 호출', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(
        <CourseSpecCard
          spec={makeSpec()}
          index={0}
          canEdit={true}
          onChange={vi.fn()}
          onDelete={onDelete}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /명세서 1 삭제/ });
      await user.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('과정명 Input 변경 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CourseSpecCard
          spec={makeSpec({ course_name: '' })}
          index={0}
          canEdit={true}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/명세서 1 과정명/);
      await user.type(input, '새');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapCourseSpec;
      expect(lastArg.course_name).toBe('새');
    });
  });
});
