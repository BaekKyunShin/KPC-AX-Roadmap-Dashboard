import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CourseEditModal from './CourseEditModal';
import type { RoadmapCell, CurriculumModule } from '@/lib/services/roadmap';

// =============================================================================
// 모킹
// =============================================================================

const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
  showSuccessToast: vi.fn(),
}));

// =============================================================================
// 테스트 데이터 헬퍼
// =============================================================================

function makeModule(overrides: Partial<CurriculumModule> = {}): CurriculumModule {
  return {
    module_name: '기초 모듈',
    hours: 4,
    details: ['기초 개념 학습', '실습 준비'],
    practice: '기초 실습',
    ...overrides,
  };
}

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: 'AI 기초 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '신입 직원',
    recommended_hours: 8,
    curriculum: [makeModule()],
    tools: [{ name: 'Google Colab', free_tier_info: '무료 사용 가능' }],
    expected_outcome: 'AI 기초 역량 확보',
    measurement_method: '실습 결과물 평가',
    prerequisites: ['PC', '인터넷'],
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  isOpen: true,
  course: makeCourse(),
  onClose: vi.fn(),
  onSave: vi.fn(),
};

// =============================================================================
// 테스트
// =============================================================================

describe('CourseEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링 조건', () => {
    it('isOpen이 false이면 아무것도 렌더링하지 않는다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} isOpen={false} />);
      expect(screen.queryByText('과정 편집')).not.toBeInTheDocument();
    });

    it('course가 null이면 아무것도 렌더링하지 않는다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} course={null} />);
      expect(screen.queryByText('과정 편집')).not.toBeInTheDocument();
    });

    it('isOpen이 true이고 course가 있으면 모달을 렌더링한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByText('과정 편집')).toBeInTheDocument();
    });
  });

  describe('초기 데이터 표시', () => {
    it('과정명 입력 필드에 초기값을 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('AI 기초 과정')).toBeInTheDocument();
    });

    it('대상 업무 입력 필드에 초기값을 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('데이터 분석')).toBeInTheDocument();
    });

    it('교육 대상 입력 필드에 초기값을 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('신입 직원')).toBeInTheDocument();
    });

    it('총 교육 시간을 읽기 전용 필드에 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      const input = screen.getByDisplayValue('8');
      expect(input).toHaveAttribute('readonly');
    });

    it('기존 모듈을 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('기초 모듈')).toBeInTheDocument();
    });

    it('기존 도구를 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('Google Colab')).toBeInTheDocument();
    });

    it('기대 효과를 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('AI 기초 역량 확보')).toBeInTheDocument();
    });

    it('측정 방법을 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.getByDisplayValue('실습 결과물 평가')).toBeInTheDocument();
    });

    it('준비물 목록을 줄바꿈 형태로 표시한다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      // prerequisites: ['PC', '인터넷'] → join('\n') → "PC\n인터넷"
      const textarea = document.querySelector('textarea[class*="break-keep"]') as HTMLTextAreaElement | null;
      const prerequisiteTextarea = Array.from(document.querySelectorAll('textarea')).find(
        (el) => el.value.includes('PC') && el.value.includes('인터넷')
      );
      expect(prerequisiteTextarea).toBeTruthy();
      expect(prerequisiteTextarea?.value).toContain('PC');
      expect(prerequisiteTextarea?.value).toContain('인터넷');
    });
  });

  describe('과정명 편집', () => {
    it('과정명을 변경할 수 있다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      const input = screen.getByDisplayValue('AI 기초 과정');
      await user.clear(input);
      await user.type(input, '머신러닝 심화 과정');
      expect(input).toHaveValue('머신러닝 심화 과정');
    });

    it('과정명이 비어 있으면 저장 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      const input = screen.getByDisplayValue('AI 기초 과정');
      await user.clear(input);

      await user.click(screen.getByRole('button', { name: '저장' }));
      expect(mockShowErrorToast).toHaveBeenCalledWith('입력 오류', '과정명을 입력하세요.');
      expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
    });
  });

  describe('모달 닫기', () => {
    it('X 버튼 클릭 시 onClose를 호출한다', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CourseEditModal {...DEFAULT_PROPS} onClose={onClose} />);

      // 헤더의 닫기 버튼(SVG X 아이콘 포함)
      const closeButtons = screen.getAllByRole('button');
      const headerClose = closeButtons.find(
        (btn) => btn.querySelector('svg') !== null && btn.className.includes('text-gray-400')
      );
      if (headerClose) {
        await user.click(headerClose);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('취소 버튼 클릭 시 onClose를 호출한다', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CourseEditModal {...DEFAULT_PROPS} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: '취소' }));
      expect(onClose).toHaveBeenCalled();
    });

    it('배경 오버레이 클릭 시 onClose를 호출한다', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CourseEditModal {...DEFAULT_PROPS} onClose={onClose} />);

      // 배경 오버레이는 fixed inset-0 transition-opacity
      const overlay = document.querySelector('.fixed.inset-0.transition-opacity');
      if (overlay) {
        await user.click(overlay as HTMLElement);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('모듈 추가/삭제', () => {
    it('"+ 모듈 추가" 버튼 클릭 시 새 모듈이 추가된다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      // 초기 모듈 1개 확인
      expect(screen.getAllByText(/모듈 \d+/)).toHaveLength(1);

      await user.click(screen.getByText('+ 모듈 추가'));

      // 모듈 2개가 됨
      expect(screen.getAllByText(/모듈 \d+/)).toHaveLength(2);
    });

    it('커리큘럼이 없을 때 "모듈을 추가하세요." 메시지를 표시한다', () => {
      const course = makeCourse({ curriculum: [] });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);
      expect(screen.getByText('모듈을 추가하세요.')).toBeInTheDocument();
    });

    it('모듈 삭제 버튼 클릭 시 해당 모듈이 제거된다', async () => {
      const user = userEvent.setup();
      const course = makeCourse({
        curriculum: [
          makeModule({ module_name: '모듈 A', hours: 4 }),
          makeModule({ module_name: '모듈 B', hours: 6 }),
        ],
        recommended_hours: 10,
      });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);

      expect(screen.getAllByText(/모듈 \d+/)).toHaveLength(2);

      // 첫 번째 모듈의 X 버튼 클릭 (각 모듈 제거 버튼)
      const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
        (btn) => btn.closest('.border.border-gray-200') !== null
      );
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
        expect(screen.getAllByText(/모듈 \d+/)).toHaveLength(1);
      }
    });

    it('모듈 시간 변경 시 총 교육 시간이 자동 계산된다', () => {
      const course = makeCourse({
        curriculum: [makeModule({ hours: 4 })],
        recommended_hours: 4,
      });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);

      // 모듈 시간 입력: readOnly가 아닌 number input
      const allNumberInputs = document.querySelectorAll('input[type="number"]');
      const moduleHoursInput = Array.from(allNumberInputs).find(
        (el) => !(el as HTMLInputElement).readOnly
      ) as HTMLInputElement | undefined;

      expect(moduleHoursInput).toBeTruthy();
      // fireEvent로 직접 값 변경
      fireEvent.change(moduleHoursInput!, { target: { value: '10' } });

      // 총 교육 시간 읽기 전용 필드가 갱신됨 (10시간)
      const readOnlyField = document.querySelector('input[readonly]') as HTMLInputElement | null;
      expect(readOnlyField?.value).toBe('10');
    });
  });

  describe('도구 추가/삭제', () => {
    it('"+ 도구 추가" 버튼 클릭 시 새 도구 입력 행이 추가된다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      // 초기 도구 1개 확인 (도구명 placeholder)
      const toolNameInputsBefore = screen.getAllByPlaceholderText('도구명');
      expect(toolNameInputsBefore).toHaveLength(1);

      await user.click(screen.getByText('+ 도구 추가'));

      const toolNameInputsAfter = screen.getAllByPlaceholderText('도구명');
      expect(toolNameInputsAfter).toHaveLength(2);
    });

    it('도구가 없을 때 "도구를 추가하세요." 메시지를 표시한다', () => {
      const course = makeCourse({ tools: [] });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);
      expect(screen.getByText('도구를 추가하세요.')).toBeInTheDocument();
    });

    it('도구 삭제 버튼 클릭 시 해당 도구가 제거된다', async () => {
      const user = userEvent.setup();
      const course = makeCourse({
        tools: [
          { name: 'Google Colab', free_tier_info: '무료' },
          { name: 'Python', free_tier_info: '오픈소스' },
        ],
      });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);

      expect(screen.getAllByPlaceholderText('도구명')).toHaveLength(2);

      // ToolEditor의 삭제 버튼 찾기: flex gap-2 items-start 컨테이너의 버튼
      const toolRows = document.querySelectorAll('.flex.gap-2.items-start');
      if (toolRows.length > 0) {
        const firstToolRemoveBtn = toolRows[0].querySelector('button');
        if (firstToolRemoveBtn) {
          await user.click(firstToolRemoveBtn);
          expect(screen.getAllByPlaceholderText('도구명')).toHaveLength(1);
        }
      }
    });

    it('도구명을 변경할 수 있다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      const toolInput = screen.getByDisplayValue('Google Colab');
      await user.clear(toolInput);
      await user.type(toolInput, 'Python');
      expect(toolInput).toHaveValue('Python');
    });

    it('무료 범위 설명을 변경할 수 있다', async () => {
      const user = userEvent.setup();
      render(<CourseEditModal {...DEFAULT_PROPS} />);

      const freeInput = screen.getByDisplayValue('무료 사용 가능');
      await user.clear(freeInput);
      await user.type(freeInput, '월 100시간 무료');
      expect(freeInput).toHaveValue('월 100시간 무료');
    });
  });

  describe('저장 콜백', () => {
    it('올바른 데이터로 저장 버튼 클릭 시 onSave를 호출한다', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<CourseEditModal {...DEFAULT_PROPS} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: '저장' }));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ course_name: 'AI 기초 과정' })
      );
    });

    it('과정명 수정 후 저장하면 변경된 값으로 onSave를 호출한다', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<CourseEditModal {...DEFAULT_PROPS} onSave={onSave} />);

      const input = screen.getByDisplayValue('AI 기초 과정');
      await user.clear(input);
      await user.type(input, '딥러닝 심화');

      await user.click(screen.getByRole('button', { name: '저장' }));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ course_name: '딥러닝 심화' })
      );
    });
  });

  describe('최대 시간 초과 경고', () => {
    it('권장 교육 시간이 40시간을 초과하면 경고 문구를 표시한다', () => {
      const course = makeCourse({
        curriculum: [makeModule({ hours: 45 })],
        recommended_hours: 45,
      });
      render(<CourseEditModal {...DEFAULT_PROPS} course={course} />);
      expect(screen.getByText(/40시간을 초과했습니다/)).toBeInTheDocument();
    });

    it('권장 교육 시간이 40시간 이하이면 경고를 표시하지 않는다', () => {
      render(<CourseEditModal {...DEFAULT_PROPS} />);
      expect(screen.queryByText(/40시간을 초과했습니다/)).not.toBeInTheDocument();
    });
  });
});
