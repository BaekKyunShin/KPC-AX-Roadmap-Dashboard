import { render, screen, fireEvent, act } from '@testing-library/react';
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../actions', () => ({
  createTemplate: vi.fn().mockResolvedValue({ success: true, data: { id: 'new-id' } }),
  updateTemplate: vi.fn().mockResolvedValue({ success: true, data: {} }),
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
    vi.clearAllMocks();
    capturedOnReorder = null;
    capturedValues = null;
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
  });
});
