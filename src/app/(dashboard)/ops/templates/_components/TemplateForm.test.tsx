import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TemplateForm from './TemplateForm';

// =============================================================================
// 모킹
// =============================================================================

// onReorder 콜백을 캡처하기 위한 변수
let capturedOnReorder: ((values: string[]) => void) | null = null;
let capturedValues: string[] | null = null;

// Motion: Reorder 컴포넌트를 단순 HTML 요소로 모킹 (jsdom에서 layout 계산 불가)
vi.mock('motion/react', () => ({
  Reorder: {
    Group: ({
      children,
      as: _as,
      values,
      onReorder,
      axis: _axis,
      ...props
    }: {
      children: React.ReactNode;
      as?: string;
      values?: string[];
      onReorder?: (values: string[]) => void;
      axis?: string;
      [key: string]: unknown;
    }) => {
      // 콜백과 values를 캡처 (드래그 리오더링 테스트용)
      capturedOnReorder = onReorder ?? null;
      capturedValues = values ?? null;
      return <div data-testid="reorder-group" {...props}>{children}</div>;
    },
    Item: ({
      children,
      value: _value,
      dragListener: _dragListener,
      dragControls: _dragControls,
      whileDrag: _whileDrag,
      animate: _animate,
      transition: _transition,
      ...props
    }: {
      children: React.ReactNode;
      value?: unknown;
      dragListener?: boolean;
      dragControls?: unknown;
      whileDrag?: unknown;
      animate?: unknown;
      transition?: unknown;
      [key: string]: unknown;
    }) => <div data-testid="reorder-item" {...props}>{children}</div>,
  },
  useDragControls: () => ({ start: vi.fn() }),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const createTemplateMock = vi.fn().mockResolvedValue({ success: true, data: { id: 'new-id' } });
const updateTemplateMock = vi.fn().mockResolvedValue({ success: true, data: { message: '수정완료' } });

vi.mock('../actions', () => ({
  createTemplate: (...args: unknown[]) => createTemplateMock(...args),
  updateTemplate: (...args: unknown[]) => updateTemplateMock(...args),
}));

vi.mock('@/lib/utils', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
  scrollToElement: vi.fn(),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

// =============================================================================
// 테스트
// =============================================================================

describe('TemplateForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    capturedOnReorder = null;
    capturedValues = null;
    mockPush.mockReset();
    mockRefresh.mockReset();
    createTemplateMock.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    updateTemplateMock.mockResolvedValue({ success: true, data: { message: '수정완료' } });
  });

  describe('질문 목록 렌더링', () => {
    it('기본 상태에서 질문 1개가 렌더링되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      expect(screen.getByText(/질문 #1/)).toBeInTheDocument();
    });

    it('드래그 핸들이 각 질문 카드에 표시되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const dragHandles = screen.getAllByTitle('드래그하여 순서 변경');
      expect(dragHandles.length).toBeGreaterThanOrEqual(1);
    });

    it('드래그 핸들에 aria-label이 있어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const dragHandle = screen.getByLabelText(/질문 1 드래그하여 순서 변경/);
      expect(dragHandle).toBeInTheDocument();
    });

    it('Reorder.Group으로 감싸져 있어야 한다', () => {
      render(<TemplateForm mode="create" />);

      expect(screen.getByTestId('reorder-group')).toBeInTheDocument();
    });

    it('각 질문이 Reorder.Item으로 감싸져 있어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const reorderItems = screen.getAllByTestId('reorder-item');
      expect(reorderItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('질문 순서 변경 (버튼)', () => {
    it('아래로 이동 버튼 클릭 시 질문 순서가 바뀌어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const addButton = screen.getByText('+ 질문 추가');
      fireEvent.click(addButton);

      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '첫 번째 질문' } });
      fireEvent.change(textareas[1], { target: { value: '두 번째 질문' } });

      const downButtons = screen.getAllByTitle('아래로 이동');
      fireEvent.click(downButtons[0]);

      const updatedTextareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      expect(updatedTextareas[0]).toHaveValue('두 번째 질문');
      expect(updatedTextareas[1]).toHaveValue('첫 번째 질문');
    });

    it('위로 이동 버튼 클릭 시 질문 순서가 바뀌어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const addButton = screen.getByText('+ 질문 추가');
      fireEvent.click(addButton);

      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '첫 번째 질문' } });
      fireEvent.change(textareas[1], { target: { value: '두 번째 질문' } });

      const upButtons = screen.getAllByTitle('위로 이동');
      fireEvent.click(upButtons[1]);

      const updatedTextareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      expect(updatedTextareas[0]).toHaveValue('두 번째 질문');
      expect(updatedTextareas[1]).toHaveValue('첫 번째 질문');
    });

    it('첫 번째 질문의 위로 이동 버튼은 비활성화되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const upButtons = screen.getAllByTitle('위로 이동');
      expect(upButtons[0]).toBeDisabled();
    });

    it('마지막 질문의 아래로 이동 버튼은 비활성화되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const downButtons = screen.getAllByTitle('아래로 이동');
      expect(downButtons[downButtons.length - 1]).toBeDisabled();
    });
  });

  describe('질문 순서 변경 (드래그)', () => {
    it('드래그 리오더링 시 순서가 올바르게 변경되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      // 질문 3개 만들기
      const addButton = screen.getByText('+ 질문 추가');
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      // 각 질문에 텍스트 입력
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: 'A' } });
      fireEvent.change(textareas[1], { target: { value: 'B' } });
      fireEvent.change(textareas[2], { target: { value: 'C' } });

      // Reorder.Group에서 캡처된 values와 onReorder 확인
      expect(capturedValues).toHaveLength(3);
      expect(capturedOnReorder).not.toBeNull();

      // 드래그 리오더링 시뮬레이션: [A, B, C] → [C, A, B]
      const reversedIds = [capturedValues![2], capturedValues![0], capturedValues![1]];
      act(() => {
        capturedOnReorder!(reversedIds);
      });

      // 순서가 바뀌었는지 확인
      const updatedTextareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      expect(updatedTextareas[0]).toHaveValue('C');
      expect(updatedTextareas[1]).toHaveValue('A');
      expect(updatedTextareas[2]).toHaveValue('B');
    });
  });

  describe('질문 추가/삭제', () => {
    it('질문 추가 버튼 클릭 시 새 질문이 추가되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const addButton = screen.getByText('+ 질문 추가');
      fireEvent.click(addButton);

      expect(screen.getByText(/질문 #1/)).toBeInTheDocument();
      expect(screen.getByText(/질문 #2/)).toBeInTheDocument();
    });

    it('질문이 1개일 때 삭제하면 에러 메시지가 표시되어야 한다', () => {
      render(<TemplateForm mode="create" />);

      const deleteButton = screen.getByTitle('삭제');
      fireEvent.click(deleteButton);

      expect(screen.getByText('최소 1개의 질문이 필요합니다.')).toBeInTheDocument();
    });

    it('질문이 2개일 때 삭제하면 1개만 남는다', () => {
      render(<TemplateForm mode="create" />);
      fireEvent.click(screen.getByText('+ 질문 추가'));
      expect(screen.getAllByTestId('reorder-item').length).toBe(2);

      const deleteButtons = screen.getAllByTitle('삭제');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getAllByTestId('reorder-item').length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // isInUse prop
  // --------------------------------------------------------------------------
  describe('isInUse prop', () => {
    it('isInUse=true이면 사용 중 안내 메시지를 표시한다', () => {
      render(<TemplateForm mode="edit" isInUse={true} />);
      expect(screen.getByText(/이 템플릿은 이미 사용 중입니다/)).toBeInTheDocument();
    });

    it('isInUse=false이면 사용 중 안내 메시지를 표시하지 않는다', () => {
      render(<TemplateForm mode="edit" isInUse={false} />);
      expect(screen.queryByText(/이 템플릿은 이미 사용 중입니다/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 폼 제출 검증
  // --------------------------------------------------------------------------
  describe('폼 제출 검증', () => {
    it('이름이 비어있으면 제출 시 에러 메시지를 표시한다', async () => {
      render(<TemplateForm mode="create" />);
      // name은 빈 상태
      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('템플릿 이름을 입력하세요.')).toBeInTheDocument();
      });
    });

    it('이름은 있지만 질문 내용이 비어있으면 에러 메시지를 표시한다', async () => {
      render(<TemplateForm mode="create" />);
      // 이름 입력
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      // 질문 내용은 비어있는 상태로 제출
      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/질문 #1의 내용을 입력하세요/)).toBeInTheDocument();
      });
    });

    it('가중치가 범위를 벗어나면 에러 메시지를 표시한다', async () => {
      render(<TemplateForm mode="create" />);
      // 이름 + 질문 내용 입력
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '테스트 질문' } });
      // 가중치를 0으로 설정 (범위 위반)
      const weightInputs = screen.getAllByDisplayValue('1');
      fireEvent.change(weightInputs[0], { target: { value: '0.05' } });

      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/가중치는 0.1~10 사이여야 합니다/)).toBeInTheDocument();
      });
    });

    it('create 모드에서 성공 시 router.push로 이동한다', async () => {
      createTemplateMock.mockResolvedValue({ success: true, data: { id: 'new-id' } });
      render(<TemplateForm mode="create" />);
      // 이름 + 질문 내용 입력
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '테스트 질문' } });

      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/ops/templates/new-id');
      });
    });

    it('edit 모드에서 성공 시 router.refresh를 호출한다', async () => {
      const mockTemplate = {
        id: 'tmpl-1',
        name: '기존 템플릿',
        description: '',
        questions: [
          { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: '기존 질문', weight: 1 },
        ],
        version: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
        created_by: 'user-1',
      };
      updateTemplateMock.mockResolvedValue({
        success: true,
        data: { message: '수정완료' },
      });
      render(<TemplateForm mode="edit" template={mockTemplate} />);

      const form = screen.getByRole('button', { name: '저장' }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(updateTemplateMock).toHaveBeenCalled();
      });
    });

    it('서버 오류 응답 시 에러 메시지를 표시한다', async () => {
      createTemplateMock.mockResolvedValue({ success: false, error: '서버 오류 발생' });
      render(<TemplateForm mode="create" />);
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '테스트 질문' } });

      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(screen.getByText('서버 오류 발생')).toBeInTheDocument();
      });
    });

    it('예외 발생 시 "저장에 실패했습니다." 메시지를 표시한다', async () => {
      createTemplateMock.mockRejectedValue(new Error('네트워크 오류'));
      render(<TemplateForm mode="create" />);
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '테스트 질문' } });

      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(screen.getByText('저장에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('success 응답 시 성공 메시지를 표시한다', async () => {
      createTemplateMock.mockResolvedValue({
        success: true,
        data: { id: 'new-id', message: '생성이 완료되었습니다.' },
      });
      render(<TemplateForm mode="create" />);
      fireEvent.change(screen.getByLabelText(/템플릿 이름/), {
        target: { value: '테스트 템플릿' },
      });
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '테스트 질문' } });

      const form = screen.getByRole('button', { name: '생성' }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/ops/templates/new-id');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 드래그 리오더 — ID 불일치 안전 장치
  // --------------------------------------------------------------------------
  describe('handleDragReorder — ID 불일치 안전 장치', () => {
    it('존재하지 않는 ID가 포함된 경우 상태를 변경하지 않는다', () => {
      render(<TemplateForm mode="create" />);
      // 2개 질문 추가
      fireEvent.click(screen.getByText('+ 질문 추가'));
      const textareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textareas[0], { target: { value: '질문A' } });
      fireEvent.change(textareas[1], { target: { value: '질문B' } });

      expect(capturedOnReorder).not.toBeNull();

      // 존재하지 않는 ID 포함 → 상태 변경 없이 return
      act(() => {
        capturedOnReorder!(['not-existing-id', 'another-bad-id']);
      });

      // 순서 그대로 유지
      const updatedTextareas = screen.getAllByPlaceholderText('질문 내용을 입력하세요');
      expect(updatedTextareas[0]).toHaveValue('질문A');
      expect(updatedTextareas[1]).toHaveValue('질문B');
    });
  });

  // --------------------------------------------------------------------------
  // 질문 변경 핸들러
  // --------------------------------------------------------------------------
  describe('질문 변경 핸들러', () => {
    it('가중치 input 변경 시 값이 업데이트된다', () => {
      render(<TemplateForm mode="create" />);
      const weightInputs = screen.getAllByDisplayValue('1');
      fireEvent.change(weightInputs[0], { target: { value: '3' } });
      expect((weightInputs[0] as HTMLInputElement).value).toBe('3');
    });

    it('질문 텍스트 변경 시 값이 업데이트된다', () => {
      render(<TemplateForm mode="create" />);
      const textarea = screen.getByPlaceholderText('질문 내용을 입력하세요');
      fireEvent.change(textarea, { target: { value: '새 질문 내용' } });
      expect((textarea as HTMLTextAreaElement).value).toBe('새 질문 내용');
    });
  });
});
