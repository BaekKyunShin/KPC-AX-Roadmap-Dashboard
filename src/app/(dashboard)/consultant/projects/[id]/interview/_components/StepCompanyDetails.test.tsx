import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepCompanyDetails from './StepCompanyDetails';
import type { CompanyDetails } from '@/lib/schemas/interview';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('./FillExampleButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} data-testid="fill-example-btn">
      예시 채우기
    </button>
  ),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeCompanyDetails(overrides?: Partial<CompanyDetails>): CompanyDetails {
  return {
    systems_and_tools: [],
    ai_experience: '',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('StepCompanyDetails', () => {
  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('섹션 제목이 렌더링된다', () => {
      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails()}
          onCompanyDetailsChange={vi.fn()}
        />,
      );

      expect(screen.getByText('시스템/AI 활용 경험')).toBeInTheDocument();
    });

    it('AI 도구 사용 경험 textarea가 렌더링된다', () => {
      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ ai_experience: 'ChatGPT 사용 경험 있음' })}
          onCompanyDetailsChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('ChatGPT 사용 경험 있음')).toBeInTheDocument();
    });

    it('예시 채우기 버튼이 렌더링된다', () => {
      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails()}
          onCompanyDetailsChange={vi.fn()}
        />,
      );

      expect(screen.getByTestId('fill-example-btn')).toBeInTheDocument();
    });

    it('초기 systems_and_tools 태그가 렌더링된다', () => {
      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ systems_and_tools: ['Excel', 'Notion'] })}
          onCompanyDetailsChange={vi.fn()}
        />,
      );

      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('Notion')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. AI 경험 입력
  // -------------------------------------------------------------------------
  describe('AI 경험 입력', () => {
    it('AI 경험 textarea 입력 시 onCompanyDetailsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails()}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      const textarea = screen.getByPlaceholderText(/경험 없음/);
      await user.type(textarea, 'Copilot 사용');

      expect(mockOnChange).toHaveBeenCalled();
      // user.type은 글자 단위로 콜백을 호출하므로 최소 1회 이상 호출된 것으로 확인
      const callCount = mockOnChange.mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. 예시 채우기
  // -------------------------------------------------------------------------
  describe('예시 채우기', () => {
    it('예시 채우기 버튼 클릭 시 onCompanyDetailsChange가 예시 데이터로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails()}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByTestId('fill-example-btn'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as CompanyDetails;
      expect(called.systems_and_tools).toBeDefined();
      expect(called.systems_and_tools!.length).toBeGreaterThan(0);
      expect(called.ai_experience).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 4. 태그 입력 — Enter 키
  // -------------------------------------------------------------------------
  describe('태그 입력 (TagInput)', () => {
    it('입력 필드에 값 입력 후 Enter를 누르면 onCompanyDetailsChange가 새 태그를 포함하여 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ systems_and_tools: [] })}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      const tagInput = screen.getByPlaceholderText('시스템 또는 도구 이름 입력 후 Enter');
      await user.type(tagInput, 'Slack{Enter}');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0] as CompanyDetails;
      expect(lastCall.systems_and_tools).toContain('Slack');
    });

    it('이미 존재하는 태그는 중복 추가되지 않는다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ systems_and_tools: ['Excel'] })}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      const tagInput = screen.getByPlaceholderText('시스템 또는 도구 이름 입력 후 Enter');
      await user.type(tagInput, 'Excel{Enter}');

      // 중복이므로 호출되지 않음
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('태그 삭제 버튼 클릭 시 해당 태그가 제거된 배열로 onCompanyDetailsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ systems_and_tools: ['Excel', 'Notion'] })}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      // 태그 옆 삭제 버튼들 — SVG 버튼
      // Excel 태그의 삭제 버튼 (첫 번째)
      const tagDeleteButtons = screen.getAllByRole('button').filter(
        (btn) => !btn.textContent?.includes('예시 채우기') && !btn.textContent?.includes('추가'),
      );
      await user.click(tagDeleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalled();
      const called = mockOnChange.mock.calls[0][0] as CompanyDetails;
      expect(called.systems_and_tools).not.toContain('Excel');
      expect(called.systems_and_tools).toContain('Notion');
    });

    it('Backspace로 마지막 태그가 삭제된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepCompanyDetails
          companyDetails={makeCompanyDetails({ systems_and_tools: ['Excel', 'Notion'] })}
          onCompanyDetailsChange={mockOnChange}
        />,
      );

      const tagInput = screen.getByPlaceholderText('시스템 또는 도구 이름 입력 후 Enter');
      await user.click(tagInput);
      await user.keyboard('{Backspace}');

      expect(mockOnChange).toHaveBeenCalled();
      const called = mockOnChange.mock.calls[0][0] as CompanyDetails;
      expect(called.systems_and_tools).not.toContain('Notion');
    });
  });
});
