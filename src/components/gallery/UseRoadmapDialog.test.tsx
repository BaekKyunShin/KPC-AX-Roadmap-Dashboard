import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UseRoadmapDialog } from './UseRoadmapDialog';
import type { EligibleProject } from '@/app/(dashboard)/gallery/actions';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRouter = { push: mockPush, refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn(), forward: vi.fn(), replace: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockFetchEligibleProjects = vi.fn();
const mockCopyRoadmapToProject = vi.fn();
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/app/(dashboard)/gallery/actions', () => ({
  fetchEligibleProjects: (...args: unknown[]) => mockFetchEligibleProjects(...args),
  copyRoadmapToProject: (...args: unknown[]) => mockCopyRoadmapToProject(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// Skeleton 모킹
vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ─── 테스트 데이터 ───────────────────────────────────────────────────────────

const mockProjects: EligibleProject[] = [
  { id: 'proj-1', companyName: '삼성전자', status: 'INTERVIEWED' },
  { id: 'proj-2', companyName: 'LG전자', status: 'ROADMAP_DRAFTED' },
  { id: 'proj-3', companyName: '현대자동차', status: 'FINALIZED' },
];

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('UseRoadmapDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEligibleProjects.mockResolvedValue({
      success: true,
      data: mockProjects,
    });
    mockCopyRoadmapToProject.mockResolvedValue({
      success: true,
      data: { newVersionId: 'new-v1', versionNumber: 2 },
    });
  });

  describe('다이얼로그 열기/닫기', () => {
    it('isOpen이 false이면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <UseRoadmapDialog isOpen={false} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );
      expect(container.innerHTML).toBe('');
    });

    it('isOpen이 true이면 다이얼로그가 렌더링된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );
      expect(screen.getByText('이 로드맵을 가져오시겠습니까?')).toBeInTheDocument();
      // useEffect 비동기 상태 업데이트 완료 대기
      await waitFor(() => {
        expect(mockFetchEligibleProjects).toHaveBeenCalled();
      });
    });

    it('배경 오버레이 클릭 시 onClose가 호출된다', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={onClose} roadmapVersionId="rv-1" />
      );

      // 배경 오버레이는 bg-black/50 클래스를 가진 div
      const overlay = document.querySelector('.bg-black\\/50');
      expect(overlay).toBeTruthy();
      await user.click(overlay!);

      expect(onClose).toHaveBeenCalled();
    });

    it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={onClose} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByText('취소')).toBeInTheDocument();
      });

      await user.click(screen.getByText('취소'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('다이얼로그 내용', () => {
    it('설명 텍스트가 표시된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );
      expect(
        screen.getByText(/이 로드맵의 데이터가 선택한 프로젝트의 새 초안 버전으로 복사됩니다/)
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(mockFetchEligibleProjects).toHaveBeenCalled();
      });
    });

    it('경고 메시지가 표시된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );
      expect(
        screen.getByText('기존 초안 버전이 있으면 새 버전으로 추가됩니다.')
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(mockFetchEligibleProjects).toHaveBeenCalled();
      });
    });

    it('적용할 프로젝트 레이블이 표시된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );
      expect(screen.getByText('적용할 프로젝트')).toBeInTheDocument();
      await waitFor(() => {
        expect(mockFetchEligibleProjects).toHaveBeenCalled();
      });
    });
  });

  describe('프로젝트 로딩', () => {
    it('프로젝트 로딩 중 스켈레톤이 표시된다', () => {
      // fetchEligibleProjects를 지연
      mockFetchEligibleProjects.mockReturnValue(new Promise(() => {}));

      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBe(3);
    });

    it('프로젝트 로딩 완료 후 셀렉트 박스가 표시된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('프로젝트 목록이 빈 경우 안내 메시지가 표시된다', async () => {
      mockFetchEligibleProjects.mockResolvedValue({
        success: true,
        data: [],
      });

      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/적용 가능한 프로젝트가 없습니다/)
        ).toBeInTheDocument();
      });
    });

    it('프로젝트 목록에 회사명과 상태 레이블이 표시된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      const options = select.querySelectorAll('option');
      // 기본 옵션 + 3개 프로젝트 = 4개
      expect(options.length).toBe(4);
      expect(options[1]).toHaveTextContent('삼성전자 — 인터뷰 완료');
      expect(options[2]).toHaveTextContent('LG전자 — 로드맵 초안');
      expect(options[3]).toHaveTextContent('현대자동차 — 확정됨');
    });
  });

  describe('복사 동작', () => {
    it('프로젝트를 선택하지 않으면 가져오기 버튼이 비활성화된다', async () => {
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const importBtn = screen.getByRole('button', { name: /가져오기/ });
      expect(importBtn).toBeDisabled();
    });

    it('프로젝트를 선택하면 가져오기 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByRole('combobox'), 'proj-1');

      const importBtn = screen.getByRole('button', { name: /가져오기/ });
      expect(importBtn).not.toBeDisabled();
    });

    it('가져오기 버튼 클릭 시 copyRoadmapToProject가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-source" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByRole('combobox'), 'proj-2');
      await user.click(screen.getByRole('button', { name: /가져오기/ }));

      expect(mockCopyRoadmapToProject).toHaveBeenCalledWith({
        sourceRoadmapVersionId: 'rv-source',
        targetProjectId: 'proj-2',
      });
    });

    it('복사 성공 시 성공 토스트가 표시되고 onClose가 호출된다', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      mockCopyRoadmapToProject.mockResolvedValue({
        success: true,
        data: { newVersionId: 'new-v1', versionNumber: 3 },
      });

      render(
        <UseRoadmapDialog isOpen={true} onClose={onClose} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByRole('combobox'), 'proj-1');
      await user.click(screen.getByRole('button', { name: /가져오기/ }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '로드맵이 복사되었습니다. (버전 3)'
        );
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('복사 성공 시 해당 프로젝트 로드맵 페이지로 이동한다', async () => {
      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByRole('combobox'), 'proj-1');
      await user.click(screen.getByRole('button', { name: /가져오기/ }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/consultant/projects/proj-1/roadmap');
      });
    });

    it('복사 실패 시 에러 토스트가 표시된다', async () => {
      mockCopyRoadmapToProject.mockResolvedValue({
        success: false,
        error: '원본 로드맵을 찾을 수 없습니다.',
      });

      const user = userEvent.setup();
      render(
        <UseRoadmapDialog isOpen={true} onClose={vi.fn()} roadmapVersionId="rv-1" />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByRole('combobox'), 'proj-1');
      await user.click(screen.getByRole('button', { name: /가져오기/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '복사 실패',
          '원본 로드맵을 찾을 수 없습니다.'
        );
      });
    });
  });
});
