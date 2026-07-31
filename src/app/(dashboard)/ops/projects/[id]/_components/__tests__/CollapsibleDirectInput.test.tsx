import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollapsibleDirectInput from '../CollapsibleDirectInput';

// SelfAssessmentForm 모킹 (자체 테스트에서 별도 검증)
vi.mock('../SelfAssessmentForm', () => ({
  default: () => <div data-testid="self-assessment-form">자가진단 폼</div>,
}));

const mockTemplate = {
  id: 'template-1',
  version: 1,
  name: '기본 템플릿',
  questions: [{ id: 'q1', order: 1, dimension: '데이터', question_text: '질문1', weight: 1 }],
};

describe('CollapsibleDirectInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<CollapsibleDirectInput projectId="proj-1" template={mockTemplate} />);
  });

  it('기본 렌더링 시 트리거 버튼만 표시되고 폼은 숨김 상태', () => {
    expect(screen.getByText('운영자가 직접 입력하기')).toBeInTheDocument();
    expect(screen.queryByTestId('self-assessment-form')).not.toBeInTheDocument();
  });

  it('트리거 클릭 시 SelfAssessmentForm이 표시됨', () => {
    fireEvent.click(screen.getByText('운영자가 직접 입력하기'));

    expect(screen.getByTestId('self-assessment-form')).toBeInTheDocument();
  });

  it('다시 클릭 시 폼이 숨겨짐', () => {
    const trigger = screen.getByText('운영자가 직접 입력하기');
    fireEvent.click(trigger);
    expect(screen.getByTestId('self-assessment-form')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('self-assessment-form')).not.toBeInTheDocument();
  });

  it('트리거 버튼에 aria-expanded 속성이 올바르게 설정됨', () => {
    const trigger = screen.getByRole('button', { name: /운영자가 직접 입력하기/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('부제 텍스트가 표시됨', () => {
    expect(screen.getByText('전화·대면 등 오프라인으로 답변받은 경우')).toBeInTheDocument();
  });
});

describe('스냅샷', () => {
  it('접힌 상태의 구조가 스냅샷과 일치한다', () => {
    const { container } = render(
      <CollapsibleDirectInput projectId="proj-1" template={mockTemplate} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('펼친 상태의 구조가 스냅샷과 일치한다', () => {
    const { container } = render(
      <CollapsibleDirectInput projectId="proj-1" template={mockTemplate} />
    );
    fireEvent.click(screen.getByText('운영자가 직접 입력하기'));
    expect(container.firstChild).toMatchSnapshot();
  });
});
