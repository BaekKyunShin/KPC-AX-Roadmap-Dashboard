import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CompanyInfoEditableCard } from './CompanyInfoEditableCard';
import { updateProjectCompanyInfo } from '../actions';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../actions', () => ({
  updateProjectCompanyInfo: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Radix Select 가 사용하는 jsdom 누락 API 폴리필 ───────────────────────────
// (다른 컴포넌트 테스트와 동일한 폴리필 패턴)

if (typeof window !== 'undefined') {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {};
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}

// ─── 테스트 데이터 ─────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';
const UPDATED_AT = '2026-05-15T00:00:00.000Z';

const baseInitial = {
  company_name: '㈜KPC인재개발센터',
  industry: '교육',
  company_size: '50-299' as const,
  contact_name: '홍길동',
  contact_email: 'hong@kpc.or.kr',
  contact_phone: '010-1234-5678',
  customer_comment: 'AI 도입 교육 의뢰',
  consultant_internal_note: '의사결정자 김상무',
};

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('CompanyInfoEditableCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('view 모드 (초기)', () => {
    it('읽기 전용 정보가 표시되고 [수정] 버튼이 보인다', () => {
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      expect(screen.getByText('기업 정보')).toBeInTheDocument();
      expect(screen.getByText('㈜KPC인재개발센터')).toBeInTheDocument();
      expect(screen.getByText('hong@kpc.or.kr')).toBeInTheDocument();
      expect(
        screen.getByTestId('company-info-edit-button'),
      ).toBeInTheDocument();
    });

    it('내부 메모가 있으면 view 모드에서 표시된다', () => {
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );
      expect(screen.getByText('의사결정자 김상무')).toBeInTheDocument();
    });

    it('내부 메모가 없으면 안내 문구가 표시된다', () => {
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={{ ...baseInitial, consultant_internal_note: null }}
          updatedAt={UPDATED_AT}
        />,
      );
      expect(screen.getByText(/아직 메모가 없습니다/)).toBeInTheDocument();
    });
  });

  describe('edit 모드 전환', () => {
    it('[수정] 클릭 시 edit 폼이 나타난다', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      expect(screen.getByTestId('company-info-edit-form')).toBeInTheDocument();
      expect(screen.getByLabelText('회사명')).toHaveValue('㈜KPC인재개발센터');
      expect(screen.getByTestId('company-info-save-button')).toBeInTheDocument();
    });
  });

  describe('편집 → 저장', () => {
    it('정상 저장 시 Server Action 호출 + view 모드 복귀', async () => {
      vi.mocked(updateProjectCompanyInfo).mockResolvedValue({
        success: true,
        data: { updated_at: '2026-05-16T01:00:00.000Z' },
      });

      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const nameInput = screen.getByLabelText('회사명');
      await user.clear(nameInput);
      await user.type(nameInput, '㈜새이름인재개발센터');

      await user.click(screen.getByTestId('company-info-save-button'));

      await waitFor(() => {
        expect(updateProjectCompanyInfo).toHaveBeenCalledWith(
          PROJECT_ID,
          expect.objectContaining({ company_name: '㈜새이름인재개발센터' }),
          UPDATED_AT,
        );
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('저장 실패 시 폼 유지 + 에러 토스트', async () => {
      vi.mocked(updateProjectCompanyInfo).mockResolvedValue({
        success: false,
        error: '다른 사용자가 먼저 수정했습니다.',
      });
      const { toast } = await import('sonner');

      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const nameInput = screen.getByLabelText('회사명');
      await user.clear(nameInput);
      await user.type(nameInput, '변경');
      await user.click(screen.getByTestId('company-info-save-button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('다른 사용자가 먼저 수정했습니다.');
      });
      // edit 모드 유지
      expect(screen.getByTestId('company-info-edit-form')).toBeInTheDocument();
    });
  });

  describe('클라이언트 검증', () => {
    it('이메일 형식 오류 시 인라인 에러 노출 + Server Action 미호출', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const emailInput = screen.getByLabelText('담당자 이메일');
      await user.clear(emailInput);
      await user.type(emailInput, 'not-an-email');
      await user.click(screen.getByTestId('company-info-save-button'));

      expect(screen.getByText('유효한 이메일을 입력하세요.')).toBeInTheDocument();
      expect(updateProjectCompanyInfo).not.toHaveBeenCalled();
    });

    it('빈 회사명 시 인라인 에러 노출', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const nameInput = screen.getByLabelText('회사명');
      await user.clear(nameInput);
      await user.click(screen.getByTestId('company-info-save-button'));

      expect(screen.getByText('회사명을 입력하세요.')).toBeInTheDocument();
      // 'EditRow' 라벨 자체도 '회사명'으로 노출되는지 확인
      expect(screen.getAllByText('회사명').length).toBeGreaterThan(0);
      expect(updateProjectCompanyInfo).not.toHaveBeenCalled();
    });
  });

  describe('취소 동작', () => {
    it('변경 없이 취소 → 즉시 view 모드', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(screen.queryByTestId('company-info-edit-form')).not.toBeInTheDocument();
      expect(screen.getByTestId('company-info-edit-button')).toBeInTheDocument();
    });

    it('변경 있는 상태에서 취소 → AlertDialog 노출', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const noteInput = screen.getByLabelText('훈련코치 전용 메모');
      // textarea 의 onChange 가 명시적으로 트리거되도록 fireEvent 사용
      fireEvent.change(noteInput, { target: { value: '변경된 메모' } });

      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(
        screen.getByText('변경사항을 취소하시겠습니까?'),
      ).toBeInTheDocument();
    });

    it('AlertDialog "취소하기" 클릭 → view 모드로 돌아가고 초기값 복원', async () => {
      const user = userEvent.setup();
      render(
        <CompanyInfoEditableCard
          projectId={PROJECT_ID}
          initial={baseInitial}
          updatedAt={UPDATED_AT}
        />,
      );

      await user.click(screen.getByTestId('company-info-edit-button'));
      const noteInput = screen.getByLabelText('훈련코치 전용 메모');
      fireEvent.change(noteInput, { target: { value: '변경된 메모' } });

      await user.click(screen.getByRole('button', { name: '취소' }));
      await user.click(screen.getByRole('button', { name: '취소하기' }));

      // view 모드
      expect(screen.queryByTestId('company-info-edit-form')).not.toBeInTheDocument();
      // 원래 메모 그대로
      expect(screen.getByText('의사결정자 김상무')).toBeInTheDocument();
    });
  });
});
