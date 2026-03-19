import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BadgeSelector from './BadgeSelector';

// =============================================================================
// 테스트 데이터
// =============================================================================

const defaultProps = {
  number: 1,
  label: '전문 분야',
  description: '해당하는 분야를 모두 선택하세요.',
  options: ['AI/ML', '데이터분석', 'RPA'] as const,
  selected: [] as string[],
  onSelectionChange: vi.fn(),
  color: 'blue' as const,
};

const objectOptions = [
  { value: 'beginner', label: '초급', description: 'AI 입문 수준' },
  { value: 'intermediate', label: '중급', description: 'AI 활용 경험 보유' },
  { value: 'advanced', label: '고급', description: 'AI 전문가 수준' },
] as const;

// =============================================================================
// 테스트
// =============================================================================

describe('BadgeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('문항 번호와 라벨을 표시한다', () => {
      render(<BadgeSelector {...defaultProps} />);
      expect(screen.getByText(/1\. 전문 분야/)).toBeInTheDocument();
    });

    it('필수 표시(*)를 표시한다', () => {
      render(<BadgeSelector {...defaultProps} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('설명 텍스트를 표시한다', () => {
      render(<BadgeSelector {...defaultProps} />);
      expect(screen.getByText('해당하는 분야를 모두 선택하세요.')).toBeInTheDocument();
    });

    it('모든 문자열 옵션을 배지로 표시한다', () => {
      render(<BadgeSelector {...defaultProps} />);
      expect(screen.getByText('AI/ML')).toBeInTheDocument();
      expect(screen.getByText('데이터분석')).toBeInTheDocument();
      expect(screen.getByText('RPA')).toBeInTheDocument();
    });
  });

  describe('토글 동작', () => {
    it('선택되지 않은 배지를 클릭하면 선택에 추가된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<BadgeSelector {...defaultProps} onSelectionChange={onChange} />);

      await user.click(screen.getByText('AI/ML'));
      expect(onChange).toHaveBeenCalledWith(['AI/ML']);
    });

    it('선택된 배지를 클릭하면 선택에서 제거된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <BadgeSelector
          {...defaultProps}
          selected={['AI/ML', '데이터분석']}
          onSelectionChange={onChange}
        />,
      );

      await user.click(screen.getByText('AI/ML'));
      expect(onChange).toHaveBeenCalledWith(['데이터분석']);
    });
  });

  describe('다중 선택', () => {
    it('여러 배지를 순차적으로 선택할 수 있다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { unmount } = render(<BadgeSelector {...defaultProps} onSelectionChange={onChange} />);

      await user.click(screen.getByText('AI/ML'));
      expect(onChange).toHaveBeenCalledWith(['AI/ML']);

      // 첫 번째 선택 후 상태 업데이트 시뮬레이션
      onChange.mockClear();
      unmount();
      render(
        <BadgeSelector
          {...defaultProps}
          selected={['AI/ML']}
          onSelectionChange={onChange}
        />,
      );
      await user.click(screen.getByText('데이터분석'));
      expect(onChange).toHaveBeenCalledWith(['AI/ML', '데이터분석']);
    });

    it('이미 선택된 항목을 해제해도 나머지는 유지된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <BadgeSelector
          {...defaultProps}
          selected={['AI/ML', '데이터분석', 'RPA']}
          onSelectionChange={onChange}
        />,
      );

      await user.click(screen.getByText('데이터분석'));
      expect(onChange).toHaveBeenCalledWith(['AI/ML', 'RPA']);
    });
  });

  describe('객체 옵션 타입', () => {
    it('value/label 형태의 객체 옵션을 올바르게 표시한다', () => {
      render(
        <BadgeSelector
          {...defaultProps}
          options={objectOptions}
          color="purple"
        />,
      );
      expect(screen.getByText('초급')).toBeInTheDocument();
      expect(screen.getByText('중급')).toBeInTheDocument();
      expect(screen.getByText('고급')).toBeInTheDocument();
    });

    it('객체 옵션 클릭 시 value를 전달한다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <BadgeSelector
          {...defaultProps}
          options={objectOptions}
          onSelectionChange={onChange}
          color="indigo"
        />,
      );

      await user.click(screen.getByText('중급'));
      expect(onChange).toHaveBeenCalledWith(['intermediate']);
    });

    it('객체 옵션의 description을 title 속성으로 표시한다', () => {
      render(
        <BadgeSelector
          {...defaultProps}
          options={objectOptions}
          color="emerald"
        />,
      );
      expect(screen.getByTitle('AI 입문 수준')).toBeInTheDocument();
      expect(screen.getByTitle('AI 활용 경험 보유')).toBeInTheDocument();
    });

    it('showOptionDescriptions가 true이면 설명 텍스트를 하단에 표시한다', () => {
      render(
        <BadgeSelector
          {...defaultProps}
          options={objectOptions}
          showOptionDescriptions={true}
          color="amber"
        />,
      );
      expect(screen.getByText(/AI 입문 수준/)).toBeInTheDocument();
      expect(screen.getByText(/AI 활용 경험 보유/)).toBeInTheDocument();
      expect(screen.getByText(/AI 전문가 수준/)).toBeInTheDocument();
    });
  });

  describe('색상 테마', () => {
    it('선택된 배지에 해당 색상 클래스가 적용된다', () => {
      const { container: _container } = render(
        <BadgeSelector
          {...defaultProps}
          selected={['AI/ML']}
          color="blue"
        />,
      );
      const selectedBadge = screen.getByText('AI/ML');
      expect(selectedBadge.className).toContain('bg-blue-600');
      expect(selectedBadge.className).toContain('text-white');
    });

    it('선택되지 않은 배지에 hover 클래스가 적용된다', () => {
      render(
        <BadgeSelector
          {...defaultProps}
          selected={[]}
          color="indigo"
        />,
      );
      const badge = screen.getByText('AI/ML');
      expect(badge.className).toContain('hover:bg-indigo-50');
    });
  });
});
