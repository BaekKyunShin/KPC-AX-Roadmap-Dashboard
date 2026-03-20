import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchInput, SelectFilter, ActiveFilterBadges } from './SearchInput';

// shadcn/ui Select mock
// onValueChange를 테스트에서 직접 트리거할 수 있도록 input[type="text"] 사용
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select-wrapper" data-value={value}>
      {children}
      <input
        data-testid="select-hidden-input"
        type="text"
        defaultValue=""
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-placeholder">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

// ============================================================================
// 테스트
// ============================================================================

describe('SearchInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('input 요소가 렌더링된다', () => {
      render(<SearchInput {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('기본 placeholder가 "검색..."이다', () => {
      render(<SearchInput {...defaultProps} />);
      expect(screen.getByPlaceholderText('검색...')).toBeInTheDocument();
    });

    it('커스텀 placeholder가 적용된다', () => {
      render(<SearchInput {...defaultProps} placeholder="프로젝트 검색" />);
      expect(screen.getByPlaceholderText('프로젝트 검색')).toBeInTheDocument();
    });

    it('기본 label이 "검색"이다', () => {
      render(<SearchInput {...defaultProps} />);
      expect(screen.getByText('검색')).toBeInTheDocument();
    });

    it('커스텀 label이 표시된다', () => {
      render(<SearchInput {...defaultProps} label="이름 검색" />);
      expect(screen.getByText('이름 검색')).toBeInTheDocument();
    });

    it('value prop이 input에 반영된다', () => {
      render(<SearchInput value="테스트" onChange={vi.fn()} />);
      expect(screen.getByRole('textbox')).toHaveValue('테스트');
    });
  });

  describe('입력 동작', () => {
    it('입력 변경 시 onChange 콜백을 호출한다', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<SearchInput value="" onChange={onChange} />);

      await user.type(screen.getByRole('textbox'), 'abc');
      expect(onChange).toHaveBeenCalled();
    });

    it('onChange가 입력된 값으로 호출된다', () => {
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '검색어' },
      });
      expect(onChange).toHaveBeenCalledWith('검색어');
    });

    it('빈 문자열 입력 시 onChange가 빈 문자열로 호출된다', () => {
      const onChange = vi.fn();
      render(<SearchInput value="기존값" onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});

// ============================================================================
// SelectFilter 테스트
// ============================================================================

describe('SelectFilter', () => {
  const options = [
    { value: 'opt1', label: '옵션 1' },
    { value: 'opt2', label: '옵션 2' },
    { value: 'opt3', label: '옵션 3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('Select 컴포넌트가 렌더링된다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} />);
      expect(screen.getByTestId('select-wrapper')).toBeInTheDocument();
    });

    it('기본 label이 "필터"이다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} />);
      expect(screen.getByText('필터')).toBeInTheDocument();
    });

    it('커스텀 label이 표시된다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} label="역할" />);
      expect(screen.getByText('역할')).toBeInTheDocument();
    });

    it('options가 렌더링된다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} />);
      expect(screen.getByText('옵션 1')).toBeInTheDocument();
      expect(screen.getByText('옵션 2')).toBeInTheDocument();
      expect(screen.getByText('옵션 3')).toBeInTheDocument();
    });

    it('"전체" placeholder 옵션이 표시된다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} />);
      // SelectValue placeholder + SelectItem 전체 옵션 모두 "전체"를 표시할 수 있음
      expect(screen.getAllByText('전체').length).toBeGreaterThanOrEqual(1);
    });

    it('커스텀 placeholder가 적용된다', () => {
      render(
        <SelectFilter value="" onChange={vi.fn()} options={options} placeholder="전체 역할" />
      );
      // SelectValue placeholder + SelectItem 양쪽에 표시될 수 있음
      expect(screen.getAllByText('전체 역할').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('value 처리', () => {
    it('빈 문자열 value는 sentinel 값(__ALL__)으로 변환되어 Select에 전달된다', () => {
      render(<SelectFilter value="" onChange={vi.fn()} options={options} />);
      const selectWrapper = screen.getByTestId('select-wrapper');
      expect(selectWrapper).toHaveAttribute('data-value', '__ALL__');
    });

    it('실제 value는 그대로 Select에 전달된다', () => {
      render(<SelectFilter value="opt1" onChange={vi.fn()} options={options} />);
      const selectWrapper = screen.getByTestId('select-wrapper');
      expect(selectWrapper).toHaveAttribute('data-value', 'opt1');
    });
  });

  describe('onChange 동작', () => {
    it('일반 값 선택 시 해당 값으로 onChange를 호출한다', () => {
      const onChange = vi.fn();
      render(<SelectFilter value="" onChange={onChange} options={options} />);

      const hiddenInput = screen.getByTestId('select-hidden-input') as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: 'opt2' } });
      expect(onChange).toHaveBeenCalledWith('opt2');
    });

    it('sentinel 값(__ALL__) 선택 시 빈 문자열로 onChange를 호출한다', () => {
      const onChange = vi.fn();
      render(<SelectFilter value="opt1" onChange={onChange} options={options} />);

      const hiddenInput = screen.getByTestId('select-hidden-input') as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '__ALL__' } });
      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});

// ============================================================================
// ActiveFilterBadges 테스트
// ============================================================================

describe('ActiveFilterBadges', () => {
  describe('활성 필터가 없을 때', () => {
    it('모든 필터 value가 빈 문자열이면 null을 반환한다', () => {
      const { container } = render(
        <ActiveFilterBadges
          filters={[
            { label: '상태', value: '' },
            { label: '역할', value: '' },
          ]}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('filters가 빈 배열이면 null을 반환한다', () => {
      const { container } = render(<ActiveFilterBadges filters={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('활성 필터가 있을 때', () => {
    it('활성 필터 뱃지들을 표시한다', () => {
      render(
        <ActiveFilterBadges
          filters={[
            { label: '상태', value: 'ACTIVE' },
            { label: '역할', value: '' },
          ]}
        />
      );
      expect(screen.getByText(/상태: ACTIVE/)).toBeInTheDocument();
    });

    it('value가 빈 문자열인 필터는 표시하지 않는다', () => {
      render(
        <ActiveFilterBadges
          filters={[
            { label: '상태', value: 'ACTIVE' },
            { label: '역할', value: '' },
          ]}
        />
      );
      expect(screen.queryByText(/역할:/)).not.toBeInTheDocument();
    });

    it('여러 활성 필터를 모두 표시한다', () => {
      render(
        <ActiveFilterBadges
          filters={[
            { label: '상태', value: 'ACTIVE' },
            { label: '역할', value: 'OPS_ADMIN' },
          ]}
        />
      );
      expect(screen.getByText(/상태: ACTIVE/)).toBeInTheDocument();
      expect(screen.getByText(/역할: OPS_ADMIN/)).toBeInTheDocument();
    });
  });

  describe('필터 초기화 버튼', () => {
    it('onReset prop이 있으면 초기화 버튼을 표시한다', () => {
      const onReset = vi.fn();
      render(
        <ActiveFilterBadges
          filters={[{ label: '상태', value: 'ACTIVE' }]}
          onReset={onReset}
        />
      );
      expect(screen.getByText('필터 초기화')).toBeInTheDocument();
    });

    it('onReset prop이 없으면 초기화 버튼을 표시하지 않는다', () => {
      render(
        <ActiveFilterBadges filters={[{ label: '상태', value: 'ACTIVE' }]} />
      );
      expect(screen.queryByText('필터 초기화')).not.toBeInTheDocument();
    });

    it('초기화 버튼 클릭 시 onReset을 호출한다', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(
        <ActiveFilterBadges
          filters={[{ label: '상태', value: 'ACTIVE' }]}
          onReset={onReset}
        />
      );

      await user.click(screen.getByText('필터 초기화'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
